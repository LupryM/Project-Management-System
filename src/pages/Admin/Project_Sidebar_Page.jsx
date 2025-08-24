import React from "react";
import { Link } from "react-router-dom";
import "./Css/Project_Sidebar_Page.css";

const ProjectSidebar = () => {
  return (
    <div className="projects-tab">
      <div className="cards-container">
        <Link to="/projects/list" className="card">
          <h3>All Projects</h3>
          <p>View current and past projects</p>
        </Link>
      </div>
    </div>
  );
};

export default ProjectSidebar;
