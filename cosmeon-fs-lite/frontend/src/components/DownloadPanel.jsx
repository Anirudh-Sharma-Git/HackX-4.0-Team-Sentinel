import { useState } from "react";
import { downloadFile, verifyFile } from "../api/client";
import { Download, ShieldCheck } from "lucide-react";

export default function DownloadPanel({ files }) {
  const [fileId, setFileId] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    if (!fileId.trim()) return;
    setDownloading(true);
    setError(null);
    try {
      const res = await downloadFile(fileId.trim());
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      // Get filename from files list
      const fileInfo = files.find(f => f.file_id === fileId.trim());
      link.setAttribute("download", fileInfo?.file_name || "download");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError(e.response?.data?.detail || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleVerify = async () => {
    if (!fileId.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    setError(null);
    try {
      const res = await verifyFile(fileId.trim());
      setVerifyResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Verify failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{
      background: "#0d1117",
      border: "1px solid #1e2a4a",
      borderRadius: "12px",
      padding: "24px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <Download size={18} color="#a78bfa" />
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>Download & Verify</h2>
      </div>

      {/* File selector */}
      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px", display: "block" }}>
          SELECT FILE
        </label>
        <select
          value={fileId}
          onChange={(e) => { setFileId(e.target.value); setVerifyResult(null); }}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#060612",
            border: "1px solid #1e2a4a",
            borderRadius: "8px",
            color: "#e2e8f0",
            fontSize: "13px",
            cursor: "pointer"
          }}>
          <option value="">-- Select a file --</option>
          {files.map(f => (
            <option key={f.file_id} value={f.file_id}>
              {f.file_name} ({f.file_id})
            </option>
          ))}
        </select>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <button
          onClick={handleDownload}
          disabled={!fileId || downloading}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid rgba(167,139,250,0.3)",
            background: "rgba(167,139,250,0.1)",
            color: fileId ? "#a78bfa" : "#3a3060",
            fontSize: "13px",
            fontWeight: 600,
            cursor: fileId ? "pointer" : "not-allowed"
          }}>
          {downloading ? "⏳ Reconstructing..." : "⬇️ Download"}
        </button>
        <button
          onClick={handleVerify}
          disabled={!fileId || verifying}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid rgba(56,189,248,0.3)",
            background: "rgba(56,189,248,0.1)",
            color: fileId ? "#38bdf8" : "#1a3040",
            fontSize: "13px",
            fontWeight: 600,
            cursor: fileId ? "pointer" : "not-allowed"
          }}>
          {verifying ? "⏳ Verifying..." : "🔐 Verify Integrity"}
        </button>
      </div>

      {/* Verify results */}
      {verifyResult && (
        <div style={{
          background: verifyResult.overall === "PASS"
            ? "rgba(34,197,94,0.05)"
            : "rgba(239,68,68,0.05)",
          border: `1px solid ${verifyResult.overall === "PASS"
            ? "rgba(34,197,94,0.2)"
            : "rgba(239,68,68,0.2)"}`,
          borderRadius: "10px",
          padding: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <ShieldCheck size={16} color={verifyResult.overall === "PASS" ? "#22c55e" : "#ef4444"} />
            <span style={{
              fontWeight: 700,
              fontSize: "14px",
              color: verifyResult.overall === "PASS" ? "#22c55e" : "#ef4444"
            }}>
              Integrity: {verifyResult.overall}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {verifyResult.chunks.map(chunk => (
              <div key={chunk.chunk_id} style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                padding: "4px 0",
                borderBottom: "1px solid #1e2a4a"
              }}>
                <span style={{ color: "#64748b", fontFamily: "monospace" }}>
                  Chunk {chunk.index} — {chunk.chunk_id}
                </span>
                <span style={{ color: chunk.status === "PASS" ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                  {chunk.status === "PASS" ? "✅ PASS" : "❌ FAIL"} {chunk.source && `(${chunk.source})`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: "12px",
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "8px",
          color: "#ef4444",
          fontSize: "13px"
        }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}