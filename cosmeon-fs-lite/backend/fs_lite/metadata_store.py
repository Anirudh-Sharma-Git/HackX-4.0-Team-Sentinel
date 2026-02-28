import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
METADATA_DIR = os.path.join(BASE_DIR, "metadata")
METADATA_FILE = os.path.join(METADATA_DIR, "metadata.json")


def _load_all() -> dict:
    """Load entire metadata JSON. Returns empty dict if file doesn't exist."""
    if not os.path.exists(METADATA_FILE):
        return {}
    with open(METADATA_FILE, "r") as f:
        return json.load(f)


def _save_all(data: dict):
    """Save entire metadata JSON."""
    os.makedirs(METADATA_DIR, exist_ok=True)
    with open(METADATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


def save_manifest(manifest: dict):
    """
    Save a file manifest to metadata store.
    Strips raw chunk data (bytes) before saving — only metadata is stored.
    """
    all_data = _load_all()

    # Clean copy — remove raw bytes from chunks before saving
    clean_manifest = {
        "file_id": manifest["file_id"],
        "file_name": manifest["file_name"],
        "file_size": manifest["file_size"],
        "total_chunks": manifest["total_chunks"],
        "chunk_size": manifest["chunk_size"],
        "full_hash": manifest["full_hash"],
        "chunks": [
            {
                "id": c["id"],
                "index": c["index"],
                "size": c["size"],
                "hash": c["hash"],
                "primary_node": c.get("primary_node", ""),
                "replica_node": c.get("replica_node", "")
            }
            for c in manifest["chunks"]
        ]
    }

    all_data[manifest["file_id"]] = clean_manifest
    _save_all(all_data)
    print(f"💾 Manifest saved for file: {manifest['file_name']} (ID: {manifest['file_id']})")


def get_manifest(file_id: str) -> dict:
    """Retrieve a manifest by file ID."""
    all_data = _load_all()
    if file_id not in all_data:
        raise ValueError(f"No file found with ID: {file_id}")
    return all_data[file_id]


def list_files() -> list:
    """List all uploaded files."""
    all_data = _load_all()
    return [
        {
            "file_id": v["file_id"],
            "file_name": v["file_name"],
            "file_size": v["file_size"],
            "total_chunks": v["total_chunks"]
        }
        for v in all_data.values()
    ]


def delete_manifest(file_id: str):
    """Remove a file manifest."""
    all_data = _load_all()
    if file_id in all_data:
        del all_data[file_id]
        _save_all(all_data)
        print(f"🗑️  Manifest deleted: {file_id}")