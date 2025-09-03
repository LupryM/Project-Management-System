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
          My Dashboard
        </Link>
        <Link
          to="/my-tasks"
          className={location.pathname === "/my-tasks" ? "active" : ""}
        >
          My Tasks
        </Link>
        <Link
          to="/my-projects"
          className={location.pathname === "/my-projects" ? "active" : ""}
        >
          My Projects
        </Link>
        <button onClick={() => supabase.auth.signOut()} className="logout-btn">
          Sign Out
        </button>
      </nav>
    </div>
  );
};

export default EmployeeSidebar;
