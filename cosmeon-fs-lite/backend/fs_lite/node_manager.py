import os

# Path to the 4 satellite node folders
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODES_DIR = os.path.join(BASE_DIR, "nodes")
NODE_IDS = ["node_0", "node_1", "node_2", "node_3"]

# 🚀 New: Capacity limit per node (5 MB)
MAX_STORAGE_MB = 5
MAX_STORAGE_BYTES = MAX_STORAGE_MB * 1024 * 1024


def _get_used_storage(node_path: str) -> int:
    """Calculate total used storage in bytes for a node."""
    total = 0
    if os.path.exists(node_path):
        for f in os.listdir(node_path):
            if not f.startswith("."):
                file_path = os.path.join(node_path, f)
                if os.path.isfile(file_path):
                    total += os.path.getsize(file_path)
    return total


def has_capacity(node_id: str, chunk_size: int) -> bool:
    """Check if node has enough remaining storage for a chunk."""
    node_path = os.path.join(NODES_DIR, node_id)
    used = _get_used_storage(node_path)
    return (used + chunk_size) <= MAX_STORAGE_BYTES


def get_all_nodes() -> list:
    nodes = []

    for node_id in NODE_IDS:
        node_path = os.path.join(NODES_DIR, node_id)
        status_file = os.path.join(node_path, ".status")

        if os.path.exists(status_file):
            with open(status_file, "r") as f:
                status = f.read().strip()
        else:
            status = "ONLINE"

        used_storage = _get_used_storage(node_path)
        used_mb = round(used_storage / (1024 * 1024), 2)

        chunks = [
            f for f in os.listdir(node_path)
            if not f.startswith(".")
        ] if os.path.exists(node_path) else []

        nodes.append({
            "node_id": node_id,
            "status": status,
            "chunk_count": len(chunks),
            "used_storage_mb": used_mb,
            "max_storage_mb": MAX_STORAGE_MB,
            "path": node_path
        })

    return nodes


def get_node(node_id: str) -> dict:
    for node in get_all_nodes():
        if node["node_id"] == node_id:
            return node
    raise ValueError(f"Node not found: {node_id}")


def set_node_status(node_id: str, status: str):
    if node_id not in NODE_IDS:
        raise ValueError(f"Invalid node ID: {node_id}")
    if status not in ["ONLINE", "OFFLINE"]:
        raise ValueError("Status must be ONLINE or OFFLINE")

    node_path = os.path.join(NODES_DIR, node_id)
    status_file = os.path.join(node_path, ".status")

    with open(status_file, "w") as f:
        f.write(status)

    emoji = "🟢" if status == "ONLINE" else "🔴"
    print(f"{emoji} Node {node_id} is now {status}")


def get_online_nodes() -> list:
    return [n for n in get_all_nodes() if n["status"] == "ONLINE"]


def write_chunk_to_node(node_id: str, chunk_id: str, data: bytes):
    node_path = os.path.join(NODES_DIR, node_id)
    chunk_path = os.path.join(node_path, chunk_id)

    with open(chunk_path, "wb") as f:
        f.write(data)


def read_chunk_from_node(node_id: str, chunk_id: str) -> bytes:
    node_path = os.path.join(NODES_DIR, node_id)
    chunk_path = os.path.join(node_path, chunk_id)

    if not os.path.exists(chunk_path):
        raise FileNotFoundError(f"Chunk {chunk_id} not found on {node_id}")

    with open(chunk_path, "rb") as f:
        return f.read()