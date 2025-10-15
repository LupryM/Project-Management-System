import React from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import FunWithMamaLogo from "../ui/FUNWITHMAMA.png";

const ManagerSidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
         <div
        className="sidebar-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingRight: "1.06rem", // optional spacing
        }}
      >
        <h3 style={{ margin: 0 }}>Manager Portal</h3>
        <img
          src={FunWithMamaLogo}
          alt="Logo"
          style={{
            height: "26px", // adjust size as needed
            width: "auto",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
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
          to="/my-profile"
          className={location.pathname === "/my-profile" ? "active" : ""}
        >
          <i className="bi bi-person me-2"></i> {/* Added icon */}
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

export default ManagerSidebar;
