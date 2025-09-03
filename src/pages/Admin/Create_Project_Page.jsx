import React, { useState } from "react";
import "./Css/Create_Project_Page.css";
import { supabase } from "../../lib/supabaseClient";
import { logActivity } from "../../lib/logger";

const CreateProject = () => {
  const [project, setProject] = useState({
    title: "",
    description: "",
    category: "Content",
    deadline: "",
    priority: "Medium",
    assignedTo: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const categories = ["Content", "Design", "Development", "Marketing"];
  const priorities = ["Low", "Medium", "High"];

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setMessage("");

      // Get current user for logging
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User must be logged in to create projects");
      }

      // Insert into projects table
      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            name: project.title,
            description: project.description,
            status: "on_hold",
            due_date: project.deadline,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Log the activity with proper parameters
      const logResult = await logActivity({
        type: "project_created",
        details: `Project "${project.title}" was created.`,
        projectId: data.id,
        userId: user.id,
      });

      if (!logResult) {
        console.warn("Activity logging failed but project was created");
        // You might want to store failed logs locally or send to a backup service
      }

      setMessage("✅ Project created successfully!");
      setProject({
        title: "",
        description: "",
        category: "Content",
        deadline: "",
        priority: "Medium",
        assignedTo: "",
      });
    } catch (err) {
      console.error("Error creating project:", err.message);
      setMessage("❌ Failed to create project: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Test function to check if logging works directly
  const testLogging = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const testResult = await logActivity({
        type: "test",
        details: "Test log entry from CreateProject page",
        userId: user.id,
      });

      if (testResult) {
        setMessage("✅ Test logging successful! Check your logs.");
      } else {
        setMessage("❌ Test logging failed. Check RLS policies.");
      }
    } catch (error) {
      console.error("Test logging error:", error);
      setMessage("❌ Test logging error: " + error.message);
    }
  };

  return (
    <div className="form-card">
      <h3>Create New Project</h3>

      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={testLogging}
          style={{
            padding: "5px 10px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Test Logging
        </button>
        <span style={{ marginLeft: "10px", fontSize: "0.9em", color: "#666" }}>
          Test if logging works before creating a project
        </span>
      </div>

      <div className="form-fields">
        <input
          type="text"
          placeholder="Project Title"
          value={project.title}
          onChange={(e) => setProject({ ...project, title: e.target.value })}
          required
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
            required
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

      <button className="card" disabled={loading} onClick={handleSubmit}>
        {loading ? "Creating..." : "Create Project"}
      </button>

      {message && <p className="status-message">{message}</p>}
    </div>
  );
};

export default CreateProject;
