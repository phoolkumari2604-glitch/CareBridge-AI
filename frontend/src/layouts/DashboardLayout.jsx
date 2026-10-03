import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-main">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="app-content dashboard-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;