# 🛰 COSMEON FS-Lite  
### Orbital Distributed File System Simulation

---

## 🚀 Overview

COSMEON FS-Lite is a lightweight distributed file system simulation that demonstrates how data can be stored across multiple orbital satellite nodes.

The system:

- Splits uploaded files into chunks
- Distributes chunks across simulated satellite nodes
- Maintains metadata describing chunk locations
- Reconstructs files on demand
- Detects node failures and corruption
- Automatically repairs under-replicated data
- Simulates realistic orbital storage constraints

This project demonstrates core distributed storage principles such as replication, atomic writes, self-healing, and integrity validation.

---

## 🛰 Architecture

### 🔷 Control Plane
- FastAPI backend
- Metadata management
- Health monitoring
- Background repair daemon
- Node coordination

### 🔷 Data Plane
- Simulated satellite nodes (folder-based)
- Chunk storage
- Capacity limits
- Replica placement logic

---

## 📦 Features

### ✅ Core Distributed Storage
- File chunking
- Chunk-level SHA-256 hashing
- Full file hash verification
- Metadata tracking (chunk → node mapping)

### ✅ Replication (RF = 2)
- Primary + replica per chunk
- Load-aware primary selection
- Randomized replica placement
- Capacity validation before write

### ✅ Atomic Upload (Rollback Safe)
If replication fails:
- All written chunks are removed
- No partial state remains
- Metadata is not committed

This guarantees file-level atomicity.

### ✅ Background Auto-Repair
- Periodic health scanning
- Detects under-replication
- Recreates missing replicas automatically
- Self-healing cluster behavior

### ✅ Over-Replication Cleanup
When nodes recover:
- Extra duplicated replicas are removed
- System stabilizes to target replication factor

### ✅ Node Failure Simulation
- Manual fail/recover endpoints
- Health state transitions:
  - `HEALTHY`
  - `DEGRADED`
  - `CRITICAL`

### ✅ Storage Capacity Constraints
- Per-node storage limit
- Upload rejected if insufficient space
- Atomic rollback on capacity failure

Simulates real orbital storage limits.

### ✅ Integrity Validation
- Chunk-level hash verification
- Full file integrity verification
- Corruption detection
- CRITICAL system state on data loss

### ✅ LRU Download Cache
- In-memory LRU cache
- Cache HIT / MISS tracking
- Eviction policy
- Faster repeated downloads

### ✅ Activity Log (UI Observability)
- Live cluster event logs
- Repair events
- Failure events
- Cache activity
- Distribution activity

---

## 📊 System Health States

The cluster state is classified as:

- **HEALTHY** → All chunks satisfy replication factor
- **DEGRADED** → Under-replicated chunks detected
- **CRITICAL** → Missing or corrupted chunks detected

---

## 🔧 How It Works

### 📤 Upload Flow
1. File temporarily stored
2. File split into fixed-size chunks
3. Each chunk assigned:
   - Primary node
   - Replica node
4. Capacity validation performed
5. If failure occurs → full rollback
6. Metadata committed

### 📥 Download Flow
1. Chunks fetched from primary
2. Replica fallback if primary unavailable
3. Chunk hash verified
4. File reconstructed
5. Full file hash validated
6. File cached using LRU

### ⚠ Failure Handling
- Node failure → system becomes DEGRADED
- Background daemon detects under-replication
- Missing replicas recreated
- System returns to HEALTHY

---

## 🧠 Design Philosophy

The system prioritizes:

- Data integrity over blind availability
- Atomic operations over partial success
- Autonomous repair over manual intervention
- Realistic constraint simulation over simple folder storage

The architecture leans toward **CP (Consistency + Partition Tolerance)** in CAP theorem terms.

---

## 🛠 Setup Instructions

### 🔹 Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload


