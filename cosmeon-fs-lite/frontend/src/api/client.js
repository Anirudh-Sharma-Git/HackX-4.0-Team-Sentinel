import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

// NODES
export const getNodes = () => API.get("/nodes");
export const failNode = (nodeId) => API.post(`/nodes/${nodeId}/fail`);
export const recoverNode = (nodeId) => API.post(`/nodes/${nodeId}/recover`);

// FILES
export const getFiles = () => API.get("/files");
export const getFileInfo = (fileId) => API.get(`/files/${fileId}`);
export const verifyFile = (fileId) => API.get(`/verify/${fileId}`);

// UPLOAD
export const uploadFile = (formData, onProgress) =>
  API.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });

// DOWNLOAD
export const downloadFile = (fileId) =>
  API.get(`/download/${fileId}`, { responseType: "blob" });