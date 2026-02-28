import { useEffect, useState } from "react";
import client from "../../api/client";

export default function FileTable({ refreshTrigger }) {
  const [files, setFiles] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loadingVerify, setLoadingVerify] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, [refreshTrigger]);

  const fetchFiles = async () => {
    try {
      const res = await client.get("/files");
      setFiles(res.data.files);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  const downloadFile = (fileId) => {
    window.open(`http://localhost:8000/download/${fileId}`, "_blank");
  };

  const verifyFile = async (fileId) => {
    try {
      setLoadingVerify(fileId);
      const res = await client.get(`/verify/${fileId}`);
      setVerification(res.data);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setLoadingVerify(null);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-800">
      <h2 className="text-2xl font-semibold mb-6 text-cyan-400">
        Stored Files
      </h2>

      {files.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">
          No files uploaded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-left">
                <th className="py-4 font-medium tracking-wide">File Name</th>
                <th className="py-4 font-medium tracking-wide">Size</th>
                <th className="py-4 font-medium tracking-wide">Chunks</th>
                <th className="py-4 font-medium tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.file_id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition duration-200"
                >
                  <td className="py-4 font-medium text-slate-200">
                    {file.file_name}
                  </td>

                  <td className="text-slate-400">
                    {(file.file_size / 1024).toFixed(1)} KB
                  </td>

                  <td className="text-slate-300">
                    {file.total_chunks}
                  </td>

                  <td className="space-x-2">
                    <button
                      onClick={() => downloadFile(file.file_id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 transition"
                    >
                      Download
                    </button>

                    <button
                      onClick={() => verifyFile(file.file_id)}
                      disabled={loadingVerify === file.file_id}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-400 transition"
                    >
                      {loadingVerify === file.file_id
                        ? "Verifying..."
                        : "Verify"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Verification Result */}
      {verification && (
        <div className="mt-8 bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
          <p className="font-semibold text-sm">
            Verification Result:
            <span
              className={`ml-3 px-3 py-1 rounded-full text-xs font-bold ${
                verification.overall === "PASS"
                  ? "bg-green-900 text-green-400"
                  : "bg-red-900 text-red-400"
              }`}
            >
              {verification.overall}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}