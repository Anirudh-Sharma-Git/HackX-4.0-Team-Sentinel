import os
import hashlib
from fs_lite.metadata_store import get_manifest
from fs_lite.node_manager import get_node, read_chunk_from_node

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")


def reconstruct_file(file_id: str) -> str:
    """
    Fetches all chunks for a file, verifies hashes,
    reassembles the original file, and saves it to downloads/.
    Returns the path to the reconstructed file.
    """
    manifest = get_manifest(file_id)
    file_name = manifest["file_name"]
    total_chunks = manifest["total_chunks"]

    print(f"\n🔄 Reconstructing: {file_name} ({total_chunks} chunks)")
    print(f"   File ID  : {file_id}")
    print(f"   Expected hash: {manifest['full_hash'][:16]}...\n")

    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    output_path = os.path.join(DOWNLOADS_DIR, file_name)

    assembled_data = []
    all_passed = True

    for chunk_meta in sorted(manifest["chunks"], key=lambda c: c["index"]):
        chunk_id = chunk_meta["id"]
        primary_node = chunk_meta["primary_node"]
        replica_node = chunk_meta["replica_node"]
        expected_hash = chunk_meta["hash"]

        # Try primary node first
        data = _fetch_chunk(chunk_id, primary_node, replica_node)

        if data is None:
            print(f"   ❌ FATAL: Chunk {chunk_meta['index']} unavailable on both nodes!")
            all_passed = False
            continue

        # Verify chunk hash
        actual_hash = hashlib.sha256(data).hexdigest()
        if actual_hash == expected_hash:
            print(f"   ✅ Chunk {chunk_meta['index']:02d} — PASS | from: {primary_node}")
        else:
            print(f"   ❌ Chunk {chunk_meta['index']:02d} — FAIL | hash mismatch!")
            all_passed = False

        assembled_data.append(data)

    # Write reconstructed file
    with open(output_path, "wb") as f:
        for chunk_data in assembled_data:
            f.write(chunk_data)

    # Verify full file hash
    print(f"\n🔐 Verifying full file integrity...")
    actual_full_hash = _hash_file(output_path)

    if actual_full_hash == manifest["full_hash"]:
        print(f"   ✅ Full file hash — PASS")
        print(f"   Hash: {actual_full_hash[:16]}...")
    else:
        print(f"   ❌ Full file hash — FAIL")
        all_passed = False

    if all_passed:
        print(f"\n🎉 Reconstruction SUCCESSFUL!")
        print(f"   Saved to: {output_path}")
    else:
        print(f"\n⚠️  Reconstruction completed WITH ERRORS. File may be corrupt.")

    return output_path


def _fetch_chunk(chunk_id: str, primary_node: str, replica_node: str):
    """
    Tries to fetch a chunk from primary node.
    Falls back to replica if primary is offline or missing.
    Returns bytes or None if both fail.
    """
    # Try primary
    try:
        node_info = get_node(primary_node)
        if node_info["status"] == "ONLINE":
            return read_chunk_from_node(primary_node, chunk_id)
        else:
            print(f"   ⚠️  Primary {primary_node} is OFFLINE — trying replica {replica_node}...")
    except Exception:
        print(f"   ⚠️  Primary {primary_node} failed — trying replica {replica_node}...")

    # Try replica
    try:
        node_info = get_node(replica_node)
        if node_info["status"] == "ONLINE":
            return read_chunk_from_node(replica_node, chunk_id)
        else:
            print(f"   ⚠️  Replica {replica_node} is also OFFLINE!")
    except Exception:
        print(f"   ⚠️  Replica {replica_node} also failed!")

    return None


def _hash_file(file_path: str) -> str:
    """Compute SHA-256 of an entire file."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()