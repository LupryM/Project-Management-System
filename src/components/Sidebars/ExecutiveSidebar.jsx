import React from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

const ExecutiveSidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Executive Dashboard</h3>
      </div>
      <nav className="sidebar-nav">
        <Link
          to="/overview"
          className={location.pathname === "/overview" ? "active" : ""}
        >
          Overview
        </Link>
        <Link
          to="/reports"
          className={location.pathname === "/reports" ? "active" : ""}
        >
          Reports
        </Link>
        <Link
          to="/LogChanges"
          className={location.pathname === "/reports" ? "active" : ""}
        >
          Log Changes
        </Link>
        <button onClick={() => supabase.auth.signOut()} className="logout-btn">
          Sign Out
        </button>
      </nav>
    </div>
  );
};

export default ExecutiveSidebar;
