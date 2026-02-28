import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import aiofiles

from fs_lite.chunk_engine import split_file
from fs_lite.distributor import distribute_chunks
from fs_lite.metadata_store import save_manifest, get_manifest, list_files
from fs_lite.node_manager import get_all_nodes, set_node_status
from fs_lite.reconstruct import reconstruct_file
from fs_lite.health_monitor import scan_system_health
from fs_lite.health_monitor import repair_under_replicated_chunks

app = FastAPI(title="COSMEON FS-Lite", version="1.0.0")

# Allow React frontend to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_TEMP = "temp_uploads"
os.makedirs(UPLOAD_TEMP, exist_ok=True)


# ── HEALTH CHECK ──────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "COSMEON FS-Lite is online 🛰️"}


# ── NODES ─────────────────────────────────────────────────
@app.get("/nodes")
def get_nodes():
    """Get status of all satellite nodes."""
    return {"nodes": get_all_nodes()}


@app.post("/nodes/{node_id}/fail")
def fail_node(node_id: str):
    """Simulate a node going offline."""
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


# ── FILES ─────────────────────────────────────────────────
@app.get("/files")
def get_files():
    """List all uploaded files."""
    return {"files": list_files()}


@app.get("/files/{file_id}")
def get_file_info(file_id: str):
    """Get full manifest for a specific file."""
    try:
        return get_manifest(file_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── UPLOAD ────────────────────────────────────────────────
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a file → chunk it → distribute across nodes → save manifest.
    """
    temp_path = os.path.join(UPLOAD_TEMP, file.filename)

    # Save uploaded file temporarily
    async with aiofiles.open(temp_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    try:
        # Chunk it
        manifest = split_file(temp_path)
        # Distribute across nodes
        manifest = distribute_chunks(manifest)
        # Save manifest
        save_manifest(manifest)

        return {
            "success": True,
            "file_id": manifest["file_id"],
            "file_name": manifest["file_name"],
            "file_size": manifest["file_size"],
            "total_chunks": manifest["total_chunks"],
            "full_hash": manifest["full_hash"],
            "chunks": [
                {
                    "id": c["id"],
                    "index": c["index"],
                    "primary_node": c["primary_node"],
                    "replica_node": c["replica_node"],
                    "hash": c["hash"]
                }
                for c in manifest["chunks"]
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ── DOWNLOAD ──────────────────────────────────────────────
@app.get("/download/{file_id}")
def download_file(file_id: str):
    """
    Reconstruct a file from chunks and return it for download.
    """
    try:
        output_path = reconstruct_file(file_id)
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


# ── INTEGRITY CHECK ───────────────────────────────────────
@app.get("/verify/{file_id}")
def verify_file(file_id: str):
    """
    Run integrity check on all chunks of a file without downloading.
    """
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
            source = None

            # Try primary
            try:
                if get_node(primary)["status"] == "ONLINE":
                    data = read_chunk_from_node(primary, chunk_id)
                    source = primary
            except Exception:
                pass

            # Try replica
            if data is None:
                try:
                    if get_node(replica)["status"] == "ONLINE":
                        data = read_chunk_from_node(replica, chunk_id)
                        source = replica
                except Exception:
                    pass

            if data is None:
                results.append({
                    "chunk_id": chunk_id,
                    "index": chunk["index"],
                    "status": "UNAVAILABLE",
                    "source": None
                })
                all_passed = False
            else:
                actual_hash = hashlib.sha256(data).hexdigest()
                passed = actual_hash == expected_hash
                if not passed:
                    all_passed = False
                results.append({
                    "chunk_id": chunk_id,
                    "index": chunk["index"],
                    "status": "PASS" if passed else "FAIL",
                    "source": source
                })

        return {
            "file_id": file_id,
            "file_name": manifest["file_name"],
            "overall": "PASS" if all_passed else "FAIL",
            "chunks": results
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# ── SYSTEM HEALTH ───────────────────────────────────────
@app.get("/health")
def system_health():
    """
    Returns full distributed system health report.
    """
    return scan_system_health()

@app.post("/repair")
def repair_system():
    """
    Attempts to repair under-replicated chunks.
    """
    return repair_under_replicated_chunks()