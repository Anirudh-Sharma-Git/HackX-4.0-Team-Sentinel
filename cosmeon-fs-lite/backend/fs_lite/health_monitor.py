import hashlib
from fs_lite.metadata_store import list_files, get_manifest
from fs_lite.node_manager import get_node, read_chunk_from_node
from fs_lite.node_manager import get_all_nodes, write_chunk_to_node
from fs_lite.metadata_store import save_manifest

def scan_system_health() -> dict:
    """
    Scans all files and chunks.
    Detects:
    - Healthy chunks (2 copies available)
    - Under-replicated chunks (1 copy available)
    - Missing chunks (0 copies available)
    - Corrupted chunks (hash mismatch)
    """

    files = list_files()
    if not files:
        return {
            "system_status": "HEALTHY",
            "total_chunks": 0,
            "healthy_chunks": 0,
            "under_replicated_chunks": 0,
            "missing_chunks": 0,
            "corrupted_chunks": 0,
            "details": []
        }
    total_chunks = 0
    healthy_chunks = 0
    under_replicated = 0
    missing_chunks = 0
    corrupted_chunks = 0

    details = []

    for file_info in files:
        manifest = get_manifest(file_info["file_id"])

        for chunk in manifest["chunks"]:
            total_chunks += 1

            primary = chunk["primary_node"]
            replica = chunk["replica_node"]
            expected_hash = chunk["hash"]
            chunk_id = chunk["id"]

            available_copies = 0
            corrupted = False

            # Check primary
            try:
                if get_node(primary)["status"] == "ONLINE":
                    data = read_chunk_from_node(primary, chunk_id)
                    if hashlib.sha256(data).hexdigest() == expected_hash:
                        available_copies += 1
                    else:
                        corrupted = True
            except Exception:
                pass

            # Check replica
            try:
                if get_node(replica)["status"] == "ONLINE":
                    data = read_chunk_from_node(replica, chunk_id)
                    if hashlib.sha256(data).hexdigest() == expected_hash:
                        available_copies += 1
                    else:
                        corrupted = True
            except Exception:
                pass

            # Categorize
            if corrupted:
                corrupted_chunks += 1
            elif available_copies == 2:
                healthy_chunks += 1
            elif available_copies == 1:
                under_replicated += 1
            else:
                missing_chunks += 1

            details.append({
                "file_id": manifest["file_id"],
                "chunk_id": chunk_id,
                "copies_available": available_copies,
                "corrupted": corrupted
            })

        # Determine system status
        if missing_chunks > 0 or corrupted_chunks > 0:
            system_status = "CRITICAL"
        elif under_replicated > 0:
            system_status = "DEGRADED"
        else:
            system_status = "HEALTHY"

    return {
        "system_status": system_status,
        "total_chunks": total_chunks,
        "healthy_chunks": healthy_chunks,
        "under_replicated_chunks": under_replicated,
        "missing_chunks": missing_chunks,
        "corrupted_chunks": corrupted_chunks,
        "details": details
    }

def repair_under_replicated_chunks():
    """
    Repairs chunks that have only 1 healthy copy.
    Creates a new replica on another ONLINE node.
    """

    files = list_files()

    repaired = 0

    for file_info in files:
        manifest = get_manifest(file_info["file_id"])

        for chunk in manifest["chunks"]:
            primary = chunk["primary_node"]
            replica = chunk["replica_node"]
            chunk_id = chunk["id"]
            expected_hash = chunk["hash"]

            healthy_locations = []

            # Check primary
            try:
                if get_node(primary)["status"] == "ONLINE":
                    data = read_chunk_from_node(primary, chunk_id)
                    if hashlib.sha256(data).hexdigest() == expected_hash:
                        healthy_locations.append(primary)
            except Exception:
                pass

            # Check replica
            try:
                if get_node(replica)["status"] == "ONLINE":
                    data = read_chunk_from_node(replica, chunk_id)
                    if hashlib.sha256(data).hexdigest() == expected_hash:
                        healthy_locations.append(replica)
            except Exception:
                pass

            # If exactly one healthy copy → repair missing or corrupted replica
            if len(healthy_locations) == 1:
                source_node = healthy_locations[0]

                # Find ONLINE nodes
                online_nodes = [n["node_id"] for n in get_all_nodes() if n["status"] == "ONLINE"]

                for node_id in online_nodes:
                    if node_id not in healthy_locations:
                        try:
                            # Copy from healthy source
                            data = read_chunk_from_node(source_node, chunk_id)
                            write_chunk_to_node(node_id, chunk_id, data)

                            # Update metadata
                            if chunk["primary_node"] == source_node:
                                chunk["replica_node"] = node_id
                            else:
                                chunk["primary_node"] = node_id

                            repaired += 1
                            print(f"🔧 Repaired/Restored chunk {chunk_id} on {node_id}")
                            break
                        except Exception:
                            continue

        save_manifest(manifest)

    return {"repaired_chunks": repaired}