import React from "react";
import ExecutiveSidebar from "../Sidebars/ExecutiveSidebar";

const ExecutiveLayout = ({ children }) => {
  return (
    <div className="app-container">
      <ExecutiveSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

export default ExecutiveLayout;
