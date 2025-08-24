import React from "react";
import EmployeeSidebar from "../Sidebars/EmployeeSidebar";

const EmployeeLayout = ({ children }) => {
  return (
    <div className="app-container">
      <EmployeeSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

export default EmployeeLayout;
