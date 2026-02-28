import { Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import { Satellite, LayoutDashboard, Shield } from "lucide-react";

export default function App() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <nav style={{
        width: "220px",
        background: "#060612",
        borderRight: "1px solid #1e2a4a",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        position: "fixed",
        height: "100vh"
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px", padding: "0 8px" }}>
          <Satellite size={24} color="#38bdf8" />
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>COSMEON</div>
            <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "2px" }}>FS-LITE</div>
          </div>
        </div>

        {/* Nav Links */}
        <NavLink to="/" end style={navStyle}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>
        <NavLink to="/admin" style={navStyle}>
          <Shield size={16} />
          Admin Panel
        </NavLink>
      </nav>

      {/* Main content */}
      <main style={{ marginLeft: "220px", flex: 1, padding: "32px" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </main>
    </div>
  );
}

const navStyle = ({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "8px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 500,
  color: isActive ? "#38bdf8" : "#94a3b8",
  background: isActive ? "rgba(56,189,248,0.1)" : "transparent",
  border: isActive ? "1px solid rgba(56,189,248,0.2)" : "1px solid transparent",
  transition: "all 0.2s"
});