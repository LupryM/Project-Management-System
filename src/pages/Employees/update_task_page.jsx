import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./update_task.css";

const UpdateTaskPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate(); // Added for back button functionality

  // Sample data for dropdowns
  const roles = ["Employee", "Manager", "Designer"];
  const projects = ["Project A", "Project B", "Project C"];
  const statusOptions = ["Not Started", "In Progress", "Completed"];

  // Sample data for grid
  const initialGridData = [
    {
      id: 1,
      role: "Employee",
      project: "Project A",
      status: "In Progress",
      comments: "Working on work sheets",
    },
  ];

  // State management
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [comments, setComments] = useState("");
  const [gridData, setGridData] = useState(initialGridData);
  const [errors, setErrors] = useState({
    role: false,
    project: false,
    status: false,
  });

  const validateForm = () => {
    const newErrors = {
      role: !selectedRole,
      project: !selectedProject,
      status: !selectedStatus,
    };
    setErrors(newErrors);
    return !newErrors.role && !newErrors.project && !newErrors.status;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const newEntry = {
        id: gridData.length + 1,
        role: selectedRole,
        project: selectedProject,
        status: selectedStatus,
        comments: comments,
        project_id: projectId,
      };

      setGridData([...gridData, newEntry]);
      // Reset form
      setSelectedRole("");
      setSelectedProject("");
      setSelectedStatus("");
      setComments("");
      setErrors({ role: false, project: false, status: false });
    }
  };

  const handleBlur = (field) => {
    if (field === "role" && !selectedRole) {
      setErrors((prev) => ({ ...prev, role: true }));
    }
    if (field === "project" && !selectedProject) {
      setErrors((prev) => ({ ...prev, project: true }));
    }
    if (field === "status" && !selectedStatus) {
      setErrors((prev) => ({ ...prev, status: true }));
    }
  };

  return (
    <div className="app-container">
      {/* Added Back Button */}
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        className="back-button"
      >
        ← Back to Project
      </button>

      <h1>Update Project Status</h1>

      <form onSubmit={handleSubmit} className="status-form" noValidate>
        <div className="form-row">
          <div className="form-group">
            <label>Role:</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setErrors((prev) => ({ ...prev, role: false }));
              }}
              onBlur={() => handleBlur("role")}
              className={errors.role ? "error" : ""}
              required
            >
              <option value="">Select Role</option>
              {roles.map((role, index) => (
                <option key={`role-${index}`} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role && (
              <span className="error-message">Please select a role</span>
            )}
          </div>

          <div className="form-group">
            <label>Project:</label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setErrors((prev) => ({ ...prev, project: false }));
              }}
              onBlur={() => handleBlur("project")}
              className={errors.project ? "error" : ""}
              required
            >
              <option value="">Select Project</option>
              {projects.map((project, index) => (
                <option key={`project-${index}`} value={project}>
                  {project}
                </option>
              ))}
            </select>
            {errors.project && (
              <span className="error-message">Please select a project</span>
            )}
          </div>

          <div className="form-group">
            <label>Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setErrors((prev) => ({ ...prev, status: false }));
              }}
              onBlur={() => handleBlur("status")}
              className={errors.status ? "error" : ""}
              required
            >
              <option value="">Select Status</option>
              {statusOptions.map((status, index) => (
                <option key={`status-${index}`} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {errors.status && (
              <span className="error-message">Please select a status</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Comments:</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Enter your comments here..."
            rows={4}
          />
        </div>

        <button type="submit" className="submit-button">
          Update Status
        </button>
      </form>

      <div className="data-grid">
        <h2>Status Updates</h2>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Project</th>
              <th>Status</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {gridData.map((item) => (
              <tr key={`row-${item.id}`}>
                <td>{item.role}</td>
                <td>{item.project}</td>
                <td>{item.status}</td>
                <td>{item.comments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UpdateTaskPage;
