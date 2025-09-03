import React from "react";
import ManagerSidebar from "../Sidebars/ManagerSidebar";

const ManagerLayout = ({ children }) => {
  return (
    <div className="app-container">
      <ManagerSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

export default ManagerLayout;