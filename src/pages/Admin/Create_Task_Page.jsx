import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./Main_Theme.css";

const CreateTaskPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    assignee_id: "",
    deadline: "",
    priority: "Medium",
    status: "Not Started",
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Mock employee data
  const [employees] = useState([
    { id: "emp001", name: "Lupry" },
    { id: "emp002", name: "Masindi" },
    { id: "emp003", name: "Logan" },
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from("tasks")
        .insert([{ ...formData, project_id: projectId }]);

      if (submitError) throw submitError;
      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError(err.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="task-form-container">
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        className="back-button"
      >
        ← Back to Project
      </button>

      <h1>Create New Task</h1>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Task Name */}
        <div className="form-group">
          <label>Task Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
          />
        </div>

        {/* Assignee */}
        <div className="form-group">
          <label>Assignee</label>
          <select
            name="assignee_id"
            value={formData.assignee_id}
            onChange={handleChange}
            required
          >
            <option value="">Select an employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.id})
              </option>
            ))}
          </select>
        </div>

        {/* Deadline */}
        <div className="form-group">
          <label>Deadline</label>
          <input
            type="date"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            required
          />
        </div>

        {/* Priority */}
        <div className="form-group">
          <label>Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Task"}
        </button>
      </form>
    </div>
  );
};

export default CreateTaskPage;
