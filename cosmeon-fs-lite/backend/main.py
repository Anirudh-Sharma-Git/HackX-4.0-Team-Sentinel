import os
import shutil
import asyncio
from collections import OrderedDict

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import aiofiles

from fs_lite.health_monitor import scan_system_health, repair_under_replicated_chunks
from fs_lite.chunk_engine import split_file
from fs_lite.distributor import distribute_chunks
from fs_lite.metadata_store import save_manifest, get_manifest, list_files
from fs_lite.node_manager import get_all_nodes, set_node_status
from fs_lite.reconstruct import reconstruct_file

app = FastAPI(title="COSMEON FS-Lite", version="1.0.0")

# ─────────────────────────────────────────────────────────
# LRU CACHE CONFIG
# ─────────────────────────────────────────────────────────

CACHE_MAX_SIZE = 3  # maximum cached reconstructed files
file_cache = OrderedDict()  # {file_id: output_path}


def get_from_cache(file_id: str):
    if file_id in file_cache:
        file_cache.move_to_end(file_id)  # mark as recently used
        print(f"⚡ Cache HIT for file {file_id}")
        return file_cache[file_id]
    print(f"📦 Cache MISS for file {file_id}")
    return None


def add_to_cache(file_id: str, output_path: str):
    if file_id in file_cache:
        file_cache.move_to_end(file_id)
    file_cache[file_id] = output_path

    if len(file_cache) > CACHE_MAX_SIZE:
        evicted_id, _ = file_cache.popitem(last=False)
        print(f"🗑️  Cache EVICTED file {evicted_id}")


# ─────────────────────────────────────────────────────────
# BACKGROUND AUTO-REPAIR DAEMON
# ─────────────────────────────────────────────────────────

async def background_repair_daemon():
    while True:
        try:
            health = scan_system_health()

            if health["under_replicated_chunks"] > 0:
                print("🛠️  Auto-repair triggered...")
                repair_under_replicated_chunks()
                print("✅ Auto-repair completed.")

        except Exception as e:
            print(f"⚠️  Background repair error: {e}")

        await asyncio.sleep(10)


@app.on_event("startup")
async def start_background_tasks():
    asyncio.create_task(background_repair_daemon())


# ─────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_TEMP = "temp_uploads"
os.makedirs(UPLOAD_TEMP, exist_ok=True)


# ─────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "COSMEON FS-Lite is online 🛰️"}


# ─────────────────────────────────────────────────────────
# NODES
# ─────────────────────────────────────────────────────────

@app.get("/nodes")
def get_nodes():
    return {"nodes": get_all_nodes()}


@app.post("/nodes/{node_id}/fail")
def fail_node(node_id: str):
    try:
        set_node_status(node_id, "OFFLINE")
        return {"message": f"{node_id} is now OFFLINE", "status": "OFFLINE"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/nodes/{node_id}/recover")
def recover_node(node_id: str):
    try:
        set_node_status(node_id, "ONLINE")
        repair_under_replicated_chunks()
        return {"message": f"{node_id} is now ONLINE and repair triggered", "status": "ONLINE"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─────────────────────────────────────────────────────────
# FILES
# ─────────────────────────────────────────────────────────

@app.get("/files")
def get_files():
    return {"files": list_files()}


@app.get("/files/{file_id}")
def get_file_info(file_id: str):
    try:
        return get_manifest(file_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─────────────────────────────────────────────────────────
# UPLOAD
# ─────────────────────────────────────────────────────────

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    temp_path = os.path.join(UPLOAD_TEMP, file.filename)

    async with aiofiles.open(temp_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    try:
        manifest = split_file(temp_path)
        manifest = distribute_chunks(manifest)
        save_manifest(manifest)

        return {
            "success": True,
            "file_id": manifest["file_id"],
            "file_name": manifest["file_name"],
            "file_size": manifest["file_size"],
            "total_chunks": manifest["total_chunks"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ─────────────────────────────────────────────────────────
# DOWNLOAD (LRU CACHED)
# ─────────────────────────────────────────────────────────

@app.get("/download/{file_id}")
def download_file(file_id: str):
    try:
        # 1️⃣ Check cache first
        cached_path = get_from_cache(file_id)

        if cached_path:
            manifest = get_manifest(file_id)
            return FileResponse(
                path=cached_path,
                filename=manifest["file_name"],
                media_type="application/octet-stream"
            )

        # 2️⃣ Cache miss → reconstruct
        output_path = reconstruct_file(file_id)
        add_to_cache(file_id, output_path)

        manifest = get_manifest(file_id)
        return FileResponse(
            path=output_path,
            filename=manifest["file_name"],
            media_type="application/octet-stream"
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────
# VERIFY
# ─────────────────────────────────────────────────────────

@app.get("/verify/{file_id}")
def verify_file(file_id: str):
    try:
        manifest = get_manifest(file_id)
        from fs_lite.node_manager import read_chunk_from_node, get_node
        import hashlib

        results = []
        all_passed = True

        for chunk in sorted(manifest["chunks"], key=lambda c: c["index"]):
            chunk_id = chunk["id"]
            primary = chunk["primary_node"]
            replica = chunk["replica_node"]
            expected_hash = chunk["hash"]

            data = None

            try:
                if get_node(primary)["status"] == "ONLINE":
                    data = read_chunk_from_node(primary, chunk_id)
            except Exception:
                pass

            if data is None:
                try:
                    if get_node(replica)["status"] == "ONLINE":
                        data = read_chunk_from_node(replica, chunk_id)
                except Exception:
                    pass

            if data is None:
                all_passed = False
            else:
                if hashlib.sha256(data).hexdigest() != expected_hash:
                    all_passed = False

        return {
            "file_id": file_id,
            "file_name": manifest["file_name"],
            "overall": "PASS" if all_passed else "FAIL"
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─────────────────────────────────────────────────────────
# SYSTEM HEALTH
# ─────────────────────────────────────────────────────────

@app.get("/health")
def system_health():
    return scan_system_health()


@app.post("/repair")
def repair_system():
    return repair_under_replicated_chunks()

# ─────────────────────────────────────────────────────────
# RESET CLUSTER
# ─────────────────────────────────────────────────────────

@app.post("/reset")
def reset_cluster():
    """
    Deletes all chunks, metadata, downloads, and clears cache.
    Keeps node status files intact.
    """

    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))

        # 1️⃣ Clear node chunk files
        nodes_dir = os.path.join(base_dir, "nodes")
        for node_id in os.listdir(nodes_dir):
            node_path = os.path.join(nodes_dir, node_id)
            if os.path.isdir(node_path):
                for f in os.listdir(node_path):
                    if not f.startswith("."):  # preserve .status
                        file_path = os.path.join(node_path, f)
                        os.remove(file_path)

        # 2️⃣ Clear metadata
        metadata_path = os.path.join(base_dir, "metadata", "metadata.json")
        if os.path.exists(metadata_path):
            os.remove(metadata_path)

        # 3️⃣ Clear downloads
        downloads_dir = os.path.join(base_dir, "downloads")
        if os.path.exists(downloads_dir):
            for f in os.listdir(downloads_dir):
                os.remove(os.path.join(downloads_dir, f))

        # 4️⃣ Clear LRU cache
        file_cache.clear()

        print("🧹 Cluster reset completed successfully.")

        return {"message": "Cluster reset successful"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))