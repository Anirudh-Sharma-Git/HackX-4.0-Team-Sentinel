import os
import hashlib
import uuid
import json

CHUNK_SIZE = 512 * 1024  # 512KB default

def split_file(file_path: str, chunk_size: int = CHUNK_SIZE) -> dict:
    """
    Takes a file path, splits it into chunks, hashes each chunk,
    and returns a manifest dictionary describing the file.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    file_name = os.path.basename(file_path)
    file_id = str(uuid.uuid4())[:8]  # short unique ID e.g. "a3f9c1b2"
    file_size = os.path.getsize(file_path)

    chunks = []
    full_hash = hashlib.sha256()

    with open(file_path, "rb") as f:
        index = 0
        while True:
            data = f.read(chunk_size)
            if not data:
                break

            # Hash this individual chunk
            chunk_hash = hashlib.sha256(data).hexdigest()

            # Also feed into full file hash
            full_hash.update(data)

            chunk_info = {
                "id": f"{file_id}_{index}",
                "index": index,
                "size": len(data),
                "hash": chunk_hash,
                "data": data  # raw bytes, used during distribution
            }
            chunks.append(chunk_info)
            index += 1

    manifest = {
        "file_id": file_id,
        "file_name": file_name,
        "file_size": file_size,
        "total_chunks": len(chunks),
        "chunk_size": chunk_size,
        "full_hash": full_hash.hexdigest(),
        "chunks": chunks
    }

    print(f"\n✅ File split complete!")
    print(f"   File     : {file_name}")
    print(f"   Size     : {file_size / 1024:.1f} KB")
    print(f"   Chunks   : {len(chunks)}")
    print(f"   Hash     : {manifest['full_hash'][:16]}...")

    return manifest