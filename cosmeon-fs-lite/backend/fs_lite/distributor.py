from fs_lite.node_manager import get_online_nodes, write_chunk_to_node

def distribute_chunks(manifest: dict) -> dict:
    """
    Assigns each chunk to a primary node and a replica node.
    Strategy: round-robin for primary, next node in list for replica.
    Writes chunk data to both nodes.
    Returns updated manifest with node assignments.
    """
    online_nodes = get_online_nodes()

    if len(online_nodes) < 2:
        raise RuntimeError("Need at least 2 online nodes for replication!")

    node_ids = [n["node_id"] for n in online_nodes]
    total_nodes = len(node_ids)

    print(f"\n📡 Distributing {manifest['total_chunks']} chunks across {total_nodes} nodes...")
    print(f"   Replication factor: 2 (primary + 1 replica)\n")

    for i, chunk in enumerate(manifest["chunks"]):
        # Round-robin primary assignment
        primary_index = i % total_nodes
        # Replica is always the next node in the list
        replica_index = (primary_index + 1) % total_nodes

        primary_node = node_ids[primary_index]
        replica_node = node_ids[replica_index]

        # Write chunk to primary node
        write_chunk_to_node(primary_node, chunk["id"], chunk["data"])
        # Write chunk to replica node
        write_chunk_to_node(replica_node, chunk["id"], chunk["data"])

        # Update manifest with node assignment
        manifest["chunks"][i]["primary_node"] = primary_node
        manifest["chunks"][i]["replica_node"] = replica_node

        print(f"   ✅ Chunk {chunk['index']:02d} → Primary: {primary_node} | Replica: {replica_node}")

    print(f"\n🛰️  Distribution complete!")
    return manifest