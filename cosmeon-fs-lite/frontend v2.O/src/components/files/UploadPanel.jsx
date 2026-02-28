import { useState } from "react";
import client from "../../api/client";

export default function UploadPanel({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await client.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
      setFile(null);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-800">
      <h2 className="text-2xl font-semibold mb-6 text-cyan-400">
        Upload to Cluster
      </h2>

      {/* File Input Box */}
      <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-cyan-500/40 transition">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="text-sm text-slate-300"
        />

        {file && (
          <p className="mt-3 text-sm text-slate-400">
            Selected:{" "}
            <span className="text-slate-200 font-medium">
              {file.name}
            </span>
          </p>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mt-6 w-full py-3 rounded-xl text-sm font-semibold transition
          bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-400"
      >
        {uploading ? "Uploading to Orbit..." : "Upload File"}
      </button>

      {/* Result Box */}
      {result && (
        <div className="mt-6 bg-slate-800/70 backdrop-blur-sm p-5 rounded-xl border border-green-500/30">
          <p className="font-semibold text-green-400">
            Upload Successful
          </p>
          <div className="mt-2 text-sm text-slate-300 space-y-1">
            <p>
              File ID:{" "}
              <span className="text-slate-100 font-medium">
                {result.file_id}
              </span>
            </p>
            <p>
              Total Chunks:{" "}
              <span className="text-slate-100 font-medium">
                {result.total_chunks}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}