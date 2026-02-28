import { useEffect, useState } from "react";
import client from "../../api/client";

export default function NodeGrid() {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchNodes = async () => {
    try {
      const res = await client.get("/nodes");
      setNodes(res.data.nodes);
    } catch (err) {
      console.error("Failed to fetch nodes:", err);
    }
  };

  const failNode = async (id) => {
    await client.post(`/nodes/${id}/fail`);
    fetchNodes();
  };

  const recoverNode = async (id) => {
    await client.post(`/nodes/${id}/recover`);
    fetchNodes();
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-800">
      <h2 className="text-2xl font-semibold mb-6 text-cyan-400">
        Satellite Nodes
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {nodes.map((node) => {
          const isOnline = node.status === "ONLINE";

          return (
            <div
              key={node.node_id}
              className={`bg-slate-800/70 backdrop-blur-sm p-6 rounded-2xl border transition-all duration-300
                ${
                  isOnline
                    ? "border-green-500/20 hover:border-green-400/50"
                    : "border-red-500/20 hover:border-red-400/50"
                }
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="font-semibold text-lg tracking-wide">
                  {node.node_id}
                </p>

                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isOnline ? "bg-green-400" : "bg-red-400"
                    }`}
                  ></span>
                  <span
                    className={`text-xs font-medium ${
                      isOnline ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {node.status}
                  </span>
                </div>
              </div>

              {/* Chunk Count */}
              <div className="mt-4 text-sm text-slate-400">
                Chunks Stored:
                <span className="ml-2 text-slate-200 font-semibold">
                  {node.chunk_count}
                </span>
              </div>

              {/* Action Button */}
              <button
                onClick={() =>
                  isOnline
                    ? failNode(node.node_id)
                    : recoverNode(node.node_id)
                }
                className={`mt-6 w-full py-2 rounded-lg text-sm font-medium transition
                  ${
                    isOnline
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }
                `}
              >
                {isOnline ? "Simulate Failure" : "Recover Node"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}