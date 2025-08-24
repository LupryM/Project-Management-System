import React from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Admin Portal</h3>
      </div>
      <nav className="sidebar-nav">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>
          Dashboard
        </Link>
        <Link
          to="/projects"
          className={location.pathname === "/projects" ? "active" : ""}
        >
          Projects
        </Link>
        <Link
          to="/employees"
          className={location.pathname === "/employees" ? "active" : ""}
        >
          User Management
        </Link>
        <Link
          to="/settings"
          className={location.pathname === "/settings" ? "active" : ""}
        >
          Settings
        </Link>
        <button onClick={() => supabase.auth.signOut()} className="logout-btn">
          Sign Out
        </button>
      </nav>
    </div>
  );
};

export default AdminSidebar;
