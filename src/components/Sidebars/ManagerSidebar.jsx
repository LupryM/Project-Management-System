import React from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

const ManagerSidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Manager Portal</h3>
      </div>
      <nav className="sidebar-nav">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>
          <i className="bi bi-speedometer2 me-2"></i>
          Dashboard
        </Link>
        <Link
          to="/projects"
          className={location.pathname === "/projects" ? "active" : ""}
        >
          <i className="bi bi-folder me-2"></i>
          Projects
        </Link>
        <Link
          to="/Mtasks"
          className={location.pathname === "/Mtasks" ? "active" : ""}
        >
          <i className="bi bi-folder me-2"></i>
            Tasks
        </Link>
        <Link
          to="/settings"
          className={location.pathname === "/settings" ? "active" : ""}
        >
          <i className="bi bi-gear me-2"></i>
          Settings
        </Link>
        <button onClick={() => supabase.auth.signOut()} className="logout-btn">
          <i className="bi bi-box-arrow-right me-2"></i>
          Sign Out
        </button>
      </nav>
    </div>
  );
};

export default ManagerSidebar;
