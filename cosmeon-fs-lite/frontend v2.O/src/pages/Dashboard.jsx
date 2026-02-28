import { useEffect, useState } from "react";
import client from "../api/client";

export default function Dashboard() {
  const [health, setHealth] = useState(null);

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

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400">
        COSMEON FS-Lite Dashboard
      </h1>

      {health ? (
        <div className="bg-slate-900 rounded-xl p-6 shadow-lg">
          <p className="text-lg mb-2">
            System Status:{" "}
            <span
              className={
                health.system_status === "HEALTHY"
                  ? "text-green-400"
                  : health.system_status === "DEGRADED"
                  ? "text-yellow-400"
                  : "text-red-400"
              }
            >
              {health.system_status}
            </span>
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 text-sm">
            <Stat label="Total Chunks" value={health.total_chunks} />
            <Stat label="Healthy" value={health.healthy_chunks} />
            <Stat label="Under Replicated" value={health.under_replicated_chunks} />
            <Stat label="Missing" value={health.missing_chunks} />
            <Stat label="Corrupted" value={health.corrupted_chunks} />
          </div>
        </div>
      ) : (
        <p>Loading health...</p>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-800 p-4 rounded-lg">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}