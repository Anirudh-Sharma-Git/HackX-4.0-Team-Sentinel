import os
import json

# Path to the 4 satellite node folders
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODES_DIR = os.path.join(BASE_DIR, "nodes")
NODE_IDS = ["node_0", "node_1", "node_2", "node_3"]

def get_all_nodes() -> list:
    """
    Returns status info for all 4 nodes.
    """
    nodes = []
    for node_id in NODE_IDS:
        node_path = os.path.join(NODES_DIR, node_id)
        status_file = os.path.join(node_path, ".status")

        # Read status from .status file (ONLINE by default)
        if os.path.exists(status_file):
            with open(status_file, "r") as f:
                status = f.read().strip()
        else:
            status = "ONLINE"

        # Count how many chunks are stored
        chunks = [
            f for f in os.listdir(node_path)
            if not f.startswith(".")
        ] if os.path.exists(node_path) else []

        nodes.append({
            "node_id": node_id,
            "status": status,
            "chunk_count": len(chunks),
            "path": node_path
        })

    return nodes


def get_node(node_id: str) -> dict:
    """
    Returns status info for a single node.
    """
    all_nodes = get_all_nodes()
    for node in all_nodes:
        if node["node_id"] == node_id:
            return node
    raise ValueError(f"Node not found: {node_id}")


def set_node_status(node_id: str, status: str):
    """
    Sets a node as ONLINE or OFFLINE by writing a .status file.
    """
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
    """
    Returns only nodes that are currently ONLINE.
    """
    return [n for n in get_all_nodes() if n["status"] == "ONLINE"]


def write_chunk_to_node(node_id: str, chunk_id: str, data: bytes):
    """
    Writes raw chunk bytes to a node's folder.
    """
    node_path = os.path.join(NODES_DIR, node_id)
    chunk_path = os.path.join(node_path, chunk_id)

    with open(chunk_path, "wb") as f:
        f.write(data)


def read_chunk_from_node(node_id: str, chunk_id: str) -> bytes:
    """
    Reads raw chunk bytes from a node's folder.
    """
    node_path = os.path.join(NODES_DIR, node_id)
    chunk_path = os.path.join(node_path, chunk_id)

    if not os.path.exists(chunk_path):
        raise FileNotFoundError(f"Chunk {chunk_id} not found on {node_id}")

    with open(chunk_path, "rb") as f:
        return f.read()