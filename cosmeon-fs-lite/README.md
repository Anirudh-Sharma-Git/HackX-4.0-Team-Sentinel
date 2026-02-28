# 🛰️ COSMEON FS-Lite
### Orbital File System Simulation — HackX 4.0 | PS-05

A lightweight distributed file system simulation that demonstrates how data
is stored across multiple orbital satellite nodes — with chunking, replication,
integrity verification, and fault tolerance.

---

## 🚀 What It Does

- **Splits** any file into configurable chunks (default 512KB)
- **Distributes** chunks across 4 simulated satellite nodes using round-robin
- **Replicates** every chunk on 2 nodes for fault tolerance
- **Reconstructs** the original file with full SHA-256 integrity verification
- **Survives node failure** — automatically fetches from replica nodes
- **Visualizes** everything in a live React dashboard + Admin Panel

---

## 🏗️ Architecture
```
File Upload → ChunkEngine → Distributor → NodeManager → MetadataStore
                                                              ↓
File Download → ReconstructEngine ← MetadataStore ← IntegrityCheck
```

### Components

| Component | Responsibility |
|-----------|---------------|
| `chunk_engine.py` | Splits files into chunks, computes SHA-256 hashes |
| `node_manager.py` | Manages 4 satellite nodes, tracks online/offline status |
| `distributor.py` | Round-robin chunk assignment with replication factor 2 |
| `metadata_store.py` | Persists chunk manifests as JSON |
| `reconstruct.py` | Fetches chunks, verifies hashes, rebuilds file |
| `main.py` | FastAPI REST API server |
| `frontend/` | React + Vite dashboard with Admin Panel |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13 + FastAPI |
| Storage | Local filesystem (simulated nodes) |
| Metadata | JSON flat file |
| Hashing | SHA-256 (hashlib) |
| Frontend | React + Vite + Tailwind-inspired CSS |
| Charts | Recharts |
| API Docs | FastAPI auto-generated Swagger UI |

---

## ⚡ Quick Start

### 1. Clone & setup backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install fastapi uvicorn python-multipart aiofiles
uvicorn main:app --reload
```

### 2. Setup frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Open the app
| Interface | URL |
|-----------|-----|
| Dashboard | http://localhost:5173 |
| Admin Panel | http://localhost:5173/admin |
| API Docs | http://localhost:8000/docs |

---

## 🎮 How to Demo

### Upload a file
1. Go to Dashboard → drag & drop any file
2. Watch it split into chunks and distribute across nodes
3. See chunk counts update live on node cards

### Verify integrity
1. Select your file in Download panel
2. Click **🔐 Verify Integrity**
3. Every chunk shows SHA-256 PASS ✅

### Simulate node failure
1. Click **💥 Fail** on any node (Admin Panel or Dashboard)
2. Node turns red immediately
3. Click **🔐 Verify Integrity** again — still PASS ✅
4. System automatically served chunks from replica nodes

### Download & verify
1. Click **⬇️ Download**
2. File reconstructed from chunks — identical to original

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/nodes` | Get all node statuses |
| POST | `/nodes/{id}/fail` | Simulate node failure |
| POST | `/nodes/{id}/recover` | Recover a node |
| GET | `/files` | List all uploaded files |
| POST | `/upload` | Upload and distribute a file |
| GET | `/download/{id}` | Reconstruct and download a file |
| GET | `/verify/{id}` | Run integrity check on all chunks |

---

## 🔐 Integrity & Fault Tolerance

- Every chunk has a **SHA-256 hash** computed at upload time
- On download, each chunk is **re-hashed and compared**
- The full reconstructed file is **hash-verified** against the original
- With **replication factor 2**, the system survives any **single node failure**
- Replica fallback is **automatic** — zero manual intervention needed

---

## 👥 Team
HackX 4.0 — PS-05 Distributed Systems Track

> *"Data should survive the void of space."* — COSMEON FS-Lite