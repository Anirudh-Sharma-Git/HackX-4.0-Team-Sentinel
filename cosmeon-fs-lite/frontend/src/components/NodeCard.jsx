import { Satellite, Wifi, WifiOff } from "lucide-react";

export default function NodeCard({ node, onFail, onRecover }) {
  const isOnline = node.status === "ONLINE";

  return (
    <div style={{
      background: "#0d1117",
      border: `1px solid ${isOnline ? "#1a3a2a" : "#3a1a1a"}`,
      borderRadius: "12px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      boxShadow: isOnline
        ? "0 0 20px rgba(34,197,94,0.08)"
        : "0 0 20px rgba(239,68,68,0.08)",
      transition: "all 0.3s"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Satellite size={20} color={isOnline ? "#22c55e" : "#ef4444"} />
          <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>
            {node.node_id.replace("_", " ").toUpperCase()}
          </span>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "20px",
          background: isOnline ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${isOnline ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          {isOnline
            ? <Wifi size={12} color="#22c55e" />
            : <WifiOff size={12} color="#ef4444" />
          }
          <span style={{
            fontSize: "11px",
            fontWeight: 600,
            color: isOnline ? "#22c55e" : "#ef4444",
            letterSpacing: "1px"
          }}>
            {node.status}
          </span>
        </div>
      </div>

      {/* Chunk count */}
      <div style={{
        background: "#060612",
        borderRadius: "8px",
        padding: "12px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "28px", fontWeight: 700, color: "#38bdf8" }}>
          {node.chunk_count}
        </div>
        <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "1px" }}>
          CHUNKS STORED
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => onFail(node.node_id)}
          disabled={!isOnline}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.1)",
            color: isOnline ? "#ef4444" : "#4a2a2a",
            fontSize: "12px",
            fontWeight: 600,
            cursor: isOnline ? "pointer" : "not-allowed",
            transition: "all 0.2s"
          }}>
          💥 FAIL
        </button>
        <button
          onClick={() => onRecover(node.node_id)}
          disabled={isOnline}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.1)",
            color: !isOnline ? "#22c55e" : "#1a3a2a",
            fontSize: "12px",
            fontWeight: 600,
            cursor: !isOnline ? "pointer" : "not-allowed",
            transition: "all 0.2s"
          }}>
          ♻️ RECOVER
        </button>
      </div>
    </div>
  );
}