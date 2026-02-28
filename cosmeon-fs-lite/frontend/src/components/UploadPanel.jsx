import { useState, useRef } from "react";
import { uploadFile } from "../api/client";
import { Upload, FileUp, CheckCircle } from "lucide-react";

export default function UploadPanel({ onUploadSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await uploadFile(formData, setProgress);
      setResult(res.data);
      onUploadSuccess();
    } catch (e) {
      setError(e.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
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
        <Upload size={18} color="#38bdf8" />
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>Upload File</h2>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "#38bdf8" : "#1e2a4a"}`,
          borderRadius: "10px",
          padding: "40px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(56,189,248,0.05)" : "transparent",
          transition: "all 0.2s"
        }}>
        <FileUp size={32} color="#38bdf8" style={{ marginBottom: "12px" }} />
        <div style={{ color: "#94a3b8", fontSize: "14px" }}>
          Drag & drop any file here or <span style={{ color: "#38bdf8" }}>browse</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>Uploading & distributing chunks...</span>
            <span style={{ fontSize: "12px", color: "#38bdf8" }}>{progress}%</span>
          </div>
          <div style={{ background: "#1e2a4a", borderRadius: "4px", height: "6px" }}>
            <div style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, #0ea5e9, #38bdf8)",
              borderRadius: "4px",
              transition: "width 0.3s"
            }} />
          </div>
        </div>
      )}

      {/* Success result */}
      {result && (
        <div style={{
          marginTop: "16px",
          background: "rgba(34,197,94,0.05)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "10px",
          padding: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <CheckCircle size={16} color="#22c55e" />
            <span style={{ color: "#22c55e", fontWeight: 600, fontSize: "14px" }}>
              Upload Successful!
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              ["File", result.file_name],
              ["File ID", result.file_id],
              ["Chunks", result.total_chunks],
              ["Size", `${(result.file_size / 1024).toFixed(1)} KB`],
              ["Hash", result.full_hash?.slice(0, 20) + "..."],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#64748b" }}>{label}</span>
                <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: "16px",
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