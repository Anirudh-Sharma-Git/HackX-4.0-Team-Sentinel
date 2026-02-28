import { useState, useEffect, useCallback } from "react";
import { getNodes, getFiles, failNode, recoverNode } from "../api/client";
import NodeCard from "../components/NodeCard";
import UploadPanel from "../components/UploadPanel";
import DownloadPanel from "../components/DownloadPanel";
import { Activity } from "lucide-react";

export default function Dashboard() {
  const [nodes, setNodes] = useState([]);
  const [files, setFiles] = useState([]);
  const [logs, setLogs] = useState([]);

  const addLog = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  const fetchNodes = useCallback(async () => {
    try {
      const res = await getNodes();
      setNodes(res.data.nodes);
    } catch (e) {
      addLog("Failed to fetch nodes", "error");
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await getFiles();
      setFiles(res.data.files);
    } catch (e) {
      addLog("Failed to fetch files", "error");
    }
  }, []);

  useEffect(() => {
    fetchNodes();
    fetchFiles();
    // Poll every 3 seconds for live updates
    const interval = setInterval(fetchNodes, 3000);
    return () => clearInterval(interval);
  }, [fetchNodes, fetchFiles]);

  const handleFail = async (nodeId) => {
    await failNode(nodeId);
    addLog(`💥 ${nodeId} taken OFFLINE`);
    fetchNodes();
  };

  const handleRecover = async (nodeId) => {
    await recoverNode(nodeId);
    addLog(`♻️ ${nodeId} recovered ONLINE`);
    fetchNodes();
  };

  const handleUploadSuccess = () => {
    addLog("✅ File uploaded and distributed across nodes");
    fetchNodes();
    fetchFiles();
  };

  const onlineCount = nodes.filter(n => n.status === "ONLINE").length;
  const totalChunks = nodes.reduce((sum, n) => sum + n.chunk_count, 0);

  return (
    <div style={{ maxWidth: "1200px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", marginBottom: "6px" }}>
          🛰️ Mission Control
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>
          COSMEON Orbital File System — Live Dashboard
        </p>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginBottom: "32px"
      }}>
        {[
          { label: "NODES ONLINE", value: `${onlineCount}/4`, color: "#22c55e" },
          { label: "TOTAL CHUNKS", value: totalChunks, color: "#38bdf8" },
          { label: "FILES STORED", value: files.length, color: "#a78bfa" },
          { label: "REPLICATION", value: "2x", color: "#f59e0b" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "#0d1117",
            border: "1px solid #1e2a4a",
            borderRadius: "10px",
            padding: "16px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "2px", marginTop: "4px" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Node grid */}
      <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#64748b", letterSpacing: "2px", marginBottom: "16px" }}>
        SATELLITE NODES
      </h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginBottom: "32px"
      }}>
        {nodes.map(node => (
          <NodeCard
            key={node.node_id}
            node={node}
            onFail={handleFail}
            onRecover={handleRecover}
          />
        ))}
      </div>

      {/* Upload + Download */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
        <UploadPanel onUploadSuccess={handleUploadSuccess} />
        <DownloadPanel files={files} />
      </div>

      {/* Activity Log */}
      <div style={{
        background: "#0d1117",
        border: "1px solid #1e2a4a",
        borderRadius: "12px",
        padding: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Activity size={16} color="#38bdf8" />
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>Activity Log</h2>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 6px #22c55e",
            marginLeft: "4px",
            animation: "pulse 2s infinite"
          }} />
        </div>
        <div style={{
          fontFamily: "monospace",
          fontSize: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          maxHeight: "160px",
          overflowY: "auto"
        }}>
          {logs.length === 0
            ? <span style={{ color: "#334155" }}>Waiting for activity...</span>
            : logs.map((log, i) => (
              <div key={i} style={{ color: i === 0 ? "#38bdf8" : "#475569" }}>{log}</div>
            ))
          }
        </div>
      </div>
    </div>
  );
}