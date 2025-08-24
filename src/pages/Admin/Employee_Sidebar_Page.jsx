import React from "react";
import { Link, Outlet } from "react-router-dom"; // Add Outlet import
import "./Css/Employee_Sidebar_Page.css";

const EmployeeSidebar = () => {
  return (
    <div className="employees-tab">
      <div className="cards-container">
        <Link to="/employees/list" className="card">
          <h3>Employees</h3>
          <p>View all employees in the company</p>
        </Link>
      </div>

      {/* Add this single line to render nested routes */}
      <Outlet />
    </div>
  );
};

export default EmployeeSidebar;
