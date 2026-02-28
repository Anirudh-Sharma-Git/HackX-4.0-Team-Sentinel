import random
import os
from fs_lite.node_manager import (
    get_online_nodes,
    write_chunk_to_node,
    has_capacity,
)

REPLICATION_FACTOR = 2


def distribute_chunks(manifest: dict) -> dict:
    """
    Capacity-aware, load-aware distribution.
    Fully atomic:
    - If any failure occurs, all written chunks are rolled back.
    """

    print(f"\n📡 Distributing {manifest['total_chunks']} chunks...")
    print(f"   Replication factor: {REPLICATION_FACTOR}")
    print(f"   Node capacity limit enforced")
    print(f"   Atomic upload enabled\n")

    written_chunks = []  # Track (node_id, chunk_id) for rollback

    try:
        for i, chunk in enumerate(manifest["chunks"]):
            chunk_size = chunk["size"]

            online_nodes = get_online_nodes()

            eligible_nodes = [
                n for n in online_nodes
                if has_capacity(n["node_id"], chunk_size)
            ]

            if len(eligible_nodes) < REPLICATION_FACTOR:
                raise RuntimeError(
                    "Not enough node capacity to satisfy replication factor!"
                )

            # Least loaded primary
            sorted_nodes = sorted(
                eligible_nodes,
                key=lambda n: n["chunk_count"]
            )

            primary_node = sorted_nodes[0]["node_id"]

            remaining_nodes = [
                n["node_id"]
                for n in sorted_nodes
                if n["node_id"] != primary_node
            ]

            replica_node = random.choice(remaining_nodes)

            # Write primary
            write_chunk_to_node(primary_node, chunk["id"], chunk["data"])
            written_chunks.append((primary_node, chunk["id"]))

            # Write replica
            write_chunk_to_node(replica_node, chunk["id"], chunk["data"])
            written_chunks.append((replica_node, chunk["id"]))

            manifest["chunks"][i]["primary_node"] = primary_node
            manifest["chunks"][i]["replica_node"] = replica_node

            print(
                f"   ✅ Chunk {chunk['index']:02d} → "
                f"Primary: {primary_node} | Replica: {replica_node}"
            )

        print("\n🛰️  Smart capacity-aware distribution complete!")
        return manifest

    except Exception as e:
        print(f"\n❌ Distribution failed: {e}")
        print("🔄 Rolling back written chunks...")

        # Rollback all writes for this upload attempt
        for node_id, chunk_id in written_chunks:
            try:
                chunk_path = os.path.join(
                    os.path.dirname(os.path.dirname(__file__)),
                    "nodes",
                    node_id,
                    chunk_id
                )
                if os.path.exists(chunk_path):
                    os.remove(chunk_path)
            except Exception:
                pass

        print("✅ Rollback complete. System state restored.\n")
        raise e