import React from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import FunWithMamaLogo from "../ui/FUNWITHMAMA.png";

const ExecutiveSidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div
        className="sidebar-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingRight: "1rem", // optional spacing
        }}
      >
        <h3 style={{ margin: 0 }}>Executive Portal</h3>
        <img
          src={FunWithMamaLogo}
          alt="Logo"
          style={{
            height: "25px", // adjust size as needed
            width: "auto",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
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
          Weekly Reports
        </Link>
        <Link
          to="/T-reports"
          className={location.pathname === "/T-reports" ? "active" : ""}
        >
          Project Portfolio
        </Link>
        <Link
          to="/P-reports"
          className={location.pathname === "/P-reports" ? "active" : ""}
        >
          Task Reports
        </Link>
        <Link
          to="/E-reports"
          className={location.pathname === "/E-reports" ? "active" : ""}
        >
          Employee Analytics
        </Link>
        <Link
          to="/LogChanges"
          className={location.pathname === "/LogChanges" ? "active" : ""}
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
