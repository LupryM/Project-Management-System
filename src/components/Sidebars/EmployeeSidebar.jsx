import React from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

const EmployeeSidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>My Workspace</h3>
      </div>
      <nav className="sidebar-nav">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>
          <i className="bi bi-speedometer2 me-2"></i>
          My Dashboard
        </Link>
        <Link
          to="/my-tasks"
          className={location.pathname === "/my-tasks" ? "active" : ""}
        >
          <i className="bi bi-list-task me-2"></i>
          My Tasks
        </Link>
        <Link
          to="/my-projects"
          className={location.pathname === "/my-projects" ? "active" : ""}
        >
          <i className="bi bi-folder me-2"></i>
          My Projects
        </Link>
        <Link
          to="/my-profile"
          className={location.pathname === "/my-profile" ? "active" : ""}
        >
          <i className="bi bi-person me-2"></i>
          Profile
        </Link>
        <button onClick={() => supabase.auth.signOut()} className="logout-btn">
          <i className="bi bi-box-arrow-right me-2"></i>
          Sign Out
        </button>
      </nav>
    </div>
  );
};

export default EmployeeSidebar;
