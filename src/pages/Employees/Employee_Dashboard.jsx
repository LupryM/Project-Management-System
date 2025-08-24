import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Form, Alert } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import "./Css/Employee_Dashboard.css";

const EmployeeDashboard = () => {
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
          await fetchUserProfile(session.user.id);
          await fetchAssignedTasks(session.user.id);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error.message);
    }
  };

  const fetchAssignedTasks = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("task_assignments")
        .select(
          `
          task:tasks (
            id,
            title,
            description,
            status,
            priority,
            due_date,
            project:projects (
              id,
              name
            )
          )
        `
        )
        .eq("user_id", userId)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      // Flatten the data structure
      const tasks = data.map((item) => ({
        ...item.task,
        project_name: item.task.project?.name || "Unknown Project",
      }));

      setAssignedTasks(tasks || []);
    } catch (error) {
      setError("Error loading assigned tasks: " + error.message);
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
      if (session) {
        await fetchAssignedTasks(session.user.id);
      }
    } catch (error) {
      setError("Error updating task status: " + error.message);
    }
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
    return (
      <Container fluid className="employee-dashboard">
        <div className="text-center my-4">Loading your tasks...</div>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container fluid className="employee-dashboard">
        <div className="text-center my-5">
          <p>Please sign in to view your tasks.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="employee-dashboard">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>My Tasks</h2>
              {userProfile && (
                <p className="text-muted">
                  Welcome, {userProfile.first_name} {userProfile.last_name}
                </p>
              )}
            </div>
            <Badge bg="primary" className="fs-6">
              {assignedTasks.length} tasks assigned
            </Badge>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert
          variant="danger"
          className="mb-3"
          onClose={() => setError(null)}
          dismissible
        >
          {error}
        </Alert>
      )}

      <Row>
        <Col>
          {assignedTasks.length > 0 ? (
            <Row>
              {assignedTasks.map((task) => (
                <Col key={task.id} lg={6} className="mb-3">
                  <Card className="h-100">
                    <Card.Header>
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">{task.title}</h6>
                        <Badge bg={getPriorityVariant(task.priority)}>
                          {getPriorityText(task.priority)}
                        </Badge>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      <p className="card-text">{task.description}</p>

                      <div className="mb-3">
                        <small className="text-muted">
                          <strong>Project:</strong> {task.project_name}
                        </small>
                      </div>

                      {task.due_date && (
                        <div className="mb-3">
                          <small className="text-muted">
                            <strong>Due Date:</strong>{" "}
                            {new Date(task.due_date).toLocaleDateString()}
                          </small>
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-center">
                        <Form.Select
                          size="sm"
                          value={task.status}
                          onChange={(e) =>
                            handleStatusChange(task.id, e.target.value)
                          }
                          style={{ width: "auto" }}
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="completed">Completed</option>
                        </Form.Select>

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
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Card>
              <Card.Body className="text-center py-5">
                <h5 className="text-muted">No tasks assigned to you yet</h5>
                <p className="text-muted">
                  Tasks assigned to you will appear here
                </p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeDashboard;
