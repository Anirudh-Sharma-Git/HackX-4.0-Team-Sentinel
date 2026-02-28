import { useEffect, useState } from "react";
import client from "../api/client";
import NodeGrid from "../components/nodes/NodeGrid";
import FileTable from "../components/files/FileTable";
import UploadPanel from "../components/files/UploadPanel";
import RepairButton from "../components/cluster/RepairButton";

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await client.get("/health");
      setHealth(res.data);
    } catch (err) {
      console.error("Health fetch failed:", err);
    }
  };

  const handleUploadSuccess = () => {
    fetchHealth();
    setRefreshKey((prev) => prev + 1);
  };

  const handleRepairSuccess = () => {
    fetchHealth();
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-10">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-cyan-400">
            COSMEON FS-Lite
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Distributed Orbital File System Simulation
          </p>
          <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full mt-4"></div>
        </div>

        {/* Health Panel */}
        {health && (
          <div className="bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-xl font-semibold">
                Cluster Status
                <span
                  className={`ml-4 px-4 py-1 rounded-full text-sm font-bold ${
                    health.system_status === "HEALTHY"
                      ? "bg-green-900 text-green-400"
                      : health.system_status === "DEGRADED"
                      ? "bg-yellow-900 text-yellow-400"
                      : "bg-red-900 text-red-400"
                  }`}
                >
                  {health.system_status}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-8 text-sm">
              <Stat label="Total Chunks" value={health.total_chunks} />
              <Stat label="Healthy" value={health.healthy_chunks} />
              <Stat label="Under Replicated" value={health.under_replicated_chunks} />
              <Stat label="Missing" value={health.missing_chunks} />
              <Stat label="Corrupted" value={health.corrupted_chunks} />
            </div>

            <div className="mt-6">
              <RepairButton
                systemStatus={health.system_status}
                onRepairSuccess={handleRepairSuccess}
              />
            </div>
          </div>
        )}

        {/* Middle Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <NodeGrid />
          </div>

          <div>
            <UploadPanel onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>

        {/* File Table */}
        <FileTable refreshTrigger={refreshKey} />

      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-800/70 backdrop-blur-sm p-5 rounded-xl border border-slate-700 hover:border-slate-600 transition">
      <p className="text-slate-400 text-xs uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-semibold mt-2">
        {value}
      </p>
    </div>
  );
}