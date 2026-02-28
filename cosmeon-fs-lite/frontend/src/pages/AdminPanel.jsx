import { useState, useEffect, useCallback } from "react";
import { getNodes, getFiles, getFileInfo, failNode, recoverNode } from "../api/client";
import { Shield, Database, HardDrive, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

const COLORS = ["#38bdf8", "#a78bfa", "#22c55e", "#f59e0b"];

export default function AdminPanel() {
  const [nodes, setNodes] = useState([]);
  const [files, setFiles] = useState([]);
  const [chunkMap, setChunkMap] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 100));
  };

  const fetchAll = useCallback(async () => {
    try {
      const [nodesRes, filesRes] = await Promise.all([getNodes(), getFiles()]);
      setNodes(nodesRes.data.nodes);
      setFiles(filesRes.data.files);

      // Build full chunk map from all files
      const allChunks = [];
      for (const file of filesRes.data.files) {
        try {
          const info = await getFileInfo(file.file_id);
          info.chunks.forEach(chunk => {
            allChunks.push({
              ...chunk,
              file_name: file.file_name,
              file_id: file.file_id,
            });
          });
        } catch (e) {}
      }
      setChunkMap(allChunks);
      addLog(`🔄 System refreshed — ${filesRes.data.files.length} files, ${allChunks.length} chunks tracked`);
    } catch (e) {
      addLog("❌ Failed to fetch system state");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleFail = async (nodeId) => {
    await failNode(nodeId);
    addLog(`💥 ADMIN: ${nodeId} forced OFFLINE`);
    fetchAll();
  };

  const handleRecover = async (nodeId) => {
    await recoverNode(nodeId);
    addLog(`♻️ ADMIN: ${nodeId} recovered ONLINE`);
    fetchAll();
  };

  // Chart data
  const pieData = nodes.map(n => ({
    name: n.node_id,
    value: n.chunk_count || 0
  }));

  const barData = nodes.map(n => ({
    node: n.node_id.replace("node_", "N"),
    chunks: n.chunk_count,
    status: n.status
  }));

  const onlineCount = nodes.filter(n => n.status === "ONLINE").length;
  const totalChunks = nodes.reduce((sum, n) => sum + n.chunk_count, 0);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ color: "#38bdf8", fontSize: "16px" }}>⏳ Loading system state...</div>
    </div>
  );

  return (
    <div style={{ maxWidth: "1200px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", marginBottom: "6px" }}>
            🛡️ Admin Control Center
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Full system visibility — nodes, chunks, files, and logs
          </p>
        </div>
        <button
          onClick={fetchAll}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 16px", borderRadius: "8px",
            border: "1px solid rgba(56,189,248,0.3)",
            background: "rgba(56,189,248,0.1)",
            color: "#38bdf8", fontSize: "13px",
            fontWeight: 600, cursor: "pointer"
          }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px", marginBottom: "32px"
      }}>
        {[
          { label: "NODES ONLINE", value: `${onlineCount}/4`, color: "#22c55e" },
          { label: "TOTAL CHUNKS", value: totalChunks, color: "#38bdf8" },
          { label: "FILES STORED", value: files.length, color: "#a78bfa" },
          { label: "CHUNK RECORDS", value: chunkMap.length, color: "#f59e0b" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "#0d1117", border: "1px solid #1e2a4a",
            borderRadius: "10px", padding: "16px", textAlign: "center"
          }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "2px", marginTop: "4px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
        {/* Pie chart */}
        <div style={{
          background: "#0d1117", border: "1px solid #1e2a4a",
          borderRadius: "12px", padding: "20px"
        }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
            📊 Chunk Distribution
          </h2>
          {totalChunks === 0
            ? <div style={{ textAlign: "center", color: "#334155", padding: "40px", fontSize: "13px" }}>
                No chunks distributed yet
              </div>
            : <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80}
                    dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0d1117", border: "1px solid #1e2a4a", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Bar chart */}
        <div style={{
          background: "#0d1117", border: "1px solid #1e2a4a",
          borderRadius: "12px", padding: "20px"
        }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
            📦 Chunks Per Node
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="node" stroke="#334155" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#0d1117", border: "1px solid #1e2a4a", borderRadius: "8px" }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="chunks" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.status === "ONLINE" ? COLORS[i % COLORS.length] : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Node control table */}
      <div style={{
        background: "#0d1117", border: "1px solid #1e2a4a",
        borderRadius: "12px", padding: "20px", marginBottom: "32px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <HardDrive size={16} color="#38bdf8" />
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>Node Control</h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Node ID", "Status", "Chunks Stored", "Actions"].map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 12px", fontSize: "11px",
                  color: "#64748b", letterSpacing: "1px",
                  borderBottom: "1px solid #1e2a4a"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodes.map((node, i) => (
              <tr key={node.node_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                <td style={{ padding: "12px", fontSize: "13px", color: "#e2e8f0", fontFamily: "monospace" }}>
                  🛰️ {node.node_id}
                </td>
                <td style={{ padding: "12px" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                    letterSpacing: "1px",
                    color: node.status === "ONLINE" ? "#22c55e" : "#ef4444",
                    background: node.status === "ONLINE" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                    border: `1px solid ${node.status === "ONLINE" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`
                  }}>
                    {node.status}
                  </span>
                </td>
                <td style={{ padding: "12px", fontSize: "13px", color: "#38bdf8", fontWeight: 600 }}>
                  {node.chunk_count}
                </td>
                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleFail(node.node_id)}
                      disabled={node.status === "OFFLINE"}
                      style={{
                        padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                        border: "1px solid rgba(239,68,68,0.3)",
                        background: "rgba(239,68,68,0.1)",
                        color: node.status === "ONLINE" ? "#ef4444" : "#4a2a2a",
                        cursor: node.status === "ONLINE" ? "pointer" : "not-allowed"
                      }}>
                      💥 Fail
                    </button>
                    <button
                      onClick={() => handleRecover(node.node_id)}
                      disabled={node.status === "ONLINE"}
                      style={{
                        padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                        border: "1px solid rgba(34,197,94,0.3)",
                        background: "rgba(34,197,94,0.1)",
                        color: node.status === "OFFLINE" ? "#22c55e" : "#1a3a2a",
                        cursor: node.status === "OFFLINE" ? "pointer" : "not-allowed"
                      }}>
                      ♻️ Recover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Files table */}
      <div style={{
        background: "#0d1117", border: "1px solid #1e2a4a",
        borderRadius: "12px", padding: "20px", marginBottom: "32px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Database size={16} color="#a78bfa" />
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>File Registry</h2>
        </div>
        {files.length === 0
          ? <div style={{ textAlign: "center", color: "#334155", padding: "30px", fontSize: "13px" }}>
              No files uploaded yet
            </div>
          : <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["File ID", "Name", "Size", "Chunks", ""].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "10px 12px", fontSize: "11px",
                      color: "#64748b", letterSpacing: "1px",
                      borderBottom: "1px solid #1e2a4a"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {files.map((file, i) => (
                  <tr key={file.file_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td style={{ padding: "12px", fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>
                      {file.file_id}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#e2e8f0" }}>
                      📄 {file.file_name}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#94a3b8" }}>
                      {(file.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#38bdf8", fontWeight: 600 }}>
                      {file.total_chunks}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button
                        onClick={() => setSelectedFile(selectedFile?.file_id === file.file_id ? null : file)}
                        style={{
                          padding: "4px 10px", borderRadius: "6px", fontSize: "11px",
                          border: "1px solid rgba(167,139,250,0.3)",
                          background: "rgba(167,139,250,0.1)",
                          color: "#a78bfa", cursor: "pointer"
                        }}>
                        {selectedFile?.file_id === file.file_id ? "Hide" : "Chunk Map"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }

        {/* Chunk map for selected file */}
        {selectedFile && (
          <div style={{ marginTop: "20px", borderTop: "1px solid #1e2a4a", paddingTop: "20px" }}>
            <h3 style={{ fontSize: "13px", color: "#a78bfa", marginBottom: "12px" }}>
              🗺️ Chunk Map — {selectedFile.file_name}
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Chunk ID", "Index", "Primary Node", "Replica Node", "Hash"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "8px 12px", fontSize: "11px",
                      color: "#64748b", letterSpacing: "1px",
                      borderBottom: "1px solid #1e2a4a"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chunkMap
                  .filter(c => c.file_id === selectedFile.file_id)
                  .map((chunk, i) => (
                    <tr key={chunk.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                      <td style={{ padding: "8px 12px", fontSize: "12px", color: "#e2e8f0", fontFamily: "monospace" }}>
                        {chunk.id}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: "12px", color: "#38bdf8", textAlign: "center" }}>
                        {chunk.index}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: "4px", fontSize: "11px",
                          background: "rgba(56,189,248,0.1)", color: "#38bdf8",
                          border: "1px solid rgba(56,189,248,0.2)"
                        }}>
                          {chunk.primary_node}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: "4px", fontSize: "11px",
                          background: "rgba(167,139,250,0.1)", color: "#a78bfa",
                          border: "1px solid rgba(167,139,250,0.2)"
                        }}>
                          {chunk.replica_node}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: "11px", color: "#475569", fontFamily: "monospace" }}>
                        {chunk.hash?.slice(0, 16)}...
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live CLI Log */}
      <div style={{
        background: "#060612", border: "1px solid #1e2a4a",
        borderRadius: "12px", padding: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Shield size={16} color="#22c55e" />
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>CLI Activity Log</h2>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: "#22c55e", boxShadow: "0 0 8px #22c55e"
          }} />
          <span style={{ fontSize: "11px", color: "#22c55e", marginLeft: "2px" }}>LIVE</span>
        </div>
        <div style={{
          fontFamily: "monospace", fontSize: "12px",
          display: "flex", flexDirection: "column", gap: "4px",
          maxHeight: "200px", overflowY: "auto"
        }}>
          {logs.length === 0
            ? <span style={{ color: "#334155" }}>$ waiting for system events...</span>
            : logs.map((log, i) => (
              <div key={i} style={{
                color: i === 0 ? "#22c55e" : "#475569",
                borderBottom: "1px solid #0d1117",
                paddingBottom: "4px"
              }}>
                $ {log}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}