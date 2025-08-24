// components/Sidebar.js
import React from "react";
import { supabase } from "../lib/supabaseClient";
import { NavLink } from "react-router-dom";
import "../components/ui/Sidebar.css"; // Optional: For custom styling

const Sidebar = () => {
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  return (
    <div
      style={{
        width: "250px",
        height: "100vh",
        backgroundColor: "#f8f9fa",
        padding: "1rem",
        borderRight: "1px solid #dee2e6",
      }}
    >
      <div className="d-flex flex-column h-100">
        <div className="mb-4">
          <h4 className="text-primary">Company Portal</h4>
        </div>

        <nav className="flex-column">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/employees">User Management</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/tasks">My Tasks</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>

        <div className="mt-auto">
          <button
            className="btn btn-outline-danger w-100"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
