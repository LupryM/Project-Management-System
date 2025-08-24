import React, { useState, useEffect } from "react";
import { Card, Badge, Button, Form } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";

const TaskList = ({ projectId, onTaskUpdated }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          *,
          assignments:task_assignments(
            user:profiles(id, first_name, last_name)
          )
        `
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      setError("Error loading tasks: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;

      // Refresh tasks list
      fetchTasks();

      // Notify parent component
      if (onTaskUpdated) onTaskUpdated();
    } catch (error) {
      setError("Error updating task: " + error.message);
    }
  };

  // Helper function to safely get user display name
  const getUserDisplayName = (user) => {
    if (!user) return "Unknown User";
    return (
      `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
      "Unknown User"
    );
  };

  const getPriorityText = (priority) => {
    const priorityMap = {
      1: "High",
      2: "Medium",
      3: "Low",
    };
    return priorityMap[priority] || "Unknown";
  };

  const getPriorityVariant = (priority) => {
    const variantMap = {
      1: "danger",
      2: "warning",
      3: "secondary",
    };
    return variantMap[priority] || "secondary";
  };

  if (loading) {
    return <div className="text-center my-4">Loading tasks...</div>;
  }

  return (
    <div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <h5 className="mb-3">Project Tasks</h5>

      {tasks.length > 0 ? (
        tasks.map((task) => (
          <Card key={task.id} className="mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <h6 className="mb-1">{task.title}</h6>
                  <p className="mb-2 text-muted small">{task.description}</p>

                  <div className="mb-2">
                    <Badge
                      bg={getPriorityVariant(task.priority)}
                      className="me-2"
                    >
                      {getPriorityText(task.priority)}
                    </Badge>
                    <Badge
                      bg={
                        task.status === "completed"
                          ? "success"
                          : task.status === "in_progress"
                          ? "primary"
                          : task.status === "review"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="mb-2">
                    <small className="text-muted">
                      <strong>Assigned to:</strong>{" "}
                      {task.assignments && task.assignments.length > 0
                        ? task.assignments
                            .filter((assignment) => assignment.user !== null) // Filter out null users
                            .map((assignment) =>
                              getUserDisplayName(assignment.user)
                            )
                            .join(", ")
                        : "Unassigned"}
                    </small>
                  </div>

                  <div className="small text-muted">
                    {task.due_date && (
                      <span>
                        <strong>Due:</strong>{" "}
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ms-3">
                  <Form.Select
                    size="sm"
                    value={task.status}
                    onChange={(e) =>
                      handleStatusChange(task.id, e.target.value)
                    }
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                  </Form.Select>
                </div>
              </div>
            </Card.Body>
          </Card>
        ))
      ) : (
        <p className="text-muted">No tasks created yet.</p>
      )}
    </div>
  );
};

export default TaskList;
