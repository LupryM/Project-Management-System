import React, { useState } from "react";
import "./Css/Create_Project_Page.css"; // Reuse your existing card styles

const CreateProject = () => {
  const [project, setProject] = useState({
    title: "",
    description: "",
    category: "Content",
    deadline: "",
    priority: "Medium",
    assignedTo: "",
  });

  const categories = ["Content", "Design", "Development", "Marketing"];
  const priorities = ["Low", "Medium", "High"];

  return (
    <div className="form-card">
      <h3>Create New Project</h3>

      <div className="form-fields">
        <input
          type="text"
          placeholder="Project Title"
          value={project.title}
          onChange={(e) => setProject({ ...project, title: e.target.value })}
        />

        <textarea
          placeholder="Description"
          value={project.description}
          onChange={(e) =>
            setProject({ ...project, description: e.target.value })
          }
        />

        <div className="form-row">
          <select
            value={project.category}
            onChange={(e) =>
              setProject({ ...project, category: e.target.value })
            }
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={project.priority}
            onChange={(e) =>
              setProject({ ...project, priority: e.target.value })
            }
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <input
            type="date"
            value={project.deadline}
            onChange={(e) =>
              setProject({ ...project, deadline: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Assigned To (Email)"
            value={project.assignedTo}
            onChange={(e) =>
              setProject({ ...project, assignedTo: e.target.value })
            }
          />
        </div>
      </div>

      <button className="card">Create Project</button>
    </div>
  );
};

export default CreateProject;
