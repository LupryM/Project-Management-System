import React from "react";
import AdminSidebar from "../Sidebars/AdminSidebar";

const AdminLayout = ({ children }) => {
  return (
    <div className="app-container">
      <AdminSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

export default AdminLayout;
