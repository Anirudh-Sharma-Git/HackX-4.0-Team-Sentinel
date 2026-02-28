import { useState } from "react";
import client from "../../api/client";

export default function RepairButton({ systemStatus, onRepairSuccess }) {
  const [repairing, setRepairing] = useState(false);

  const handleRepair = async () => {
    try {
      setRepairing(true);
      await client.post("/repair");
      if (onRepairSuccess) onRepairSuccess();
    } catch (err) {
      console.error("Repair failed:", err);
    } finally {
      setRepairing(false);
    }
  };

  if (systemStatus === "HEALTHY") return null;

  return (
    <div className="mt-6">
      <button
        onClick={handleRepair}
        disabled={repairing}
        className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-sm"
      >
        {repairing ? "Repairing..." : "Repair Cluster"}
      </button>
    </div>
  );
}