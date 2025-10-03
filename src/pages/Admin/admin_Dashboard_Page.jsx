import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Table,
  Spinner,
  Alert,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import {
  BsPeople,
  BsPerson,
  BsExclamationTriangle,
  BsCheckCircle,
  BsListCheck,
} from "react-icons/bs";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch users
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (userError) throw userError;
        setUsers(userData || []);

        // Fetch projects
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id, name, status, due_date");
        if (projectError) throw projectError;
        setProjects(projectData || []);

        // Fetch last 10 activity logs
        const { data: logData, error: logError } = await supabase
          .from("project_logs")
          .select(`*, profiles:user_id (first_name, last_name, email)`)
          .order("created_at", { ascending: false })
          .limit(10);
        if (logError) throw logError;
        setActivityLogs(logData || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err.message);
        setError("Failed to load dashboard data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeUsers = users.filter((u) => u.status === "Active").length;
  const inactiveUsers = users.filter((u) => u.status === "Inactive").length;
  const completedProjects = projects.filter(
    (p) => p.status === "completed"
  ).length;
  const inProgressProjects = projects.filter(
    (p) => p.status === "in_progress"
  ).length;

  const getRoleBadge = (role) => {
    const variants = {
      admin: "danger",
      executive: "info",
      manager: "warning",
      employee: "success",
    };
    return (
      <Badge pill bg={variants[role] || "secondary"} className="text-uppercase">
        {role}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Container fluid className="p-4">
        <div className="text-center my-5 py-5">
          <Spinner animation="border" role="status" className="me-2" />
          Loading dashboard...
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="p-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4 bg-light min-vh-100">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold">
            <BsListCheck className="me-2" />
            Admin Dashboard
          </h2>
          <p className="text-muted">Overview of users and projects</p>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={2} sm={6} className="mb-3">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="text-primary mb-0">{users.length}</h3>
              <small className="text-muted">Total Users</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={6} className="mb-3">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="text-success mb-0">{activeUsers}</h3>
              <small className="text-muted">Active Users</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={6} className="mb-3">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="text-secondary mb-0">{inactiveUsers}</h3>
              <small className="text-muted">Inactive Users</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={6} className="mb-3">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="text-primary mb-0">{projects.length}</h3>
              <small className="text-muted">Total Projects</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={6} className="mb-3">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="text-success mb-0">{completedProjects}</h3>
              <small className="text-muted">Completed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={6} className="mb-3">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="text-primary mb-0">{inProgressProjects}</h3>
              <small className="text-muted">In Progress</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Inactive Users Panel */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <BsExclamationTriangle className="me-2 text-warning" />
                Inactive Users
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((u) => u.status === "Inactive")
                    .slice(0, 5)
                    .map((user) => (
                      <tr key={user.id} className="text-muted">
                        <td>
                          {user.first_name} {user.last_name}
                        </td>
                        <td>{user.email}</td>
                        <td>{getRoleBadge(user.role)}</td>
                        <td>
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  {inactiveUsers === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-4">
                        No inactive users
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row>
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <BsCheckCircle className="me-2 text-success" />
                Recent Activity
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>User</th>
                    <th>Activity</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-4">
                        No recent activity
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          {log.profiles
                            ? `${log.profiles.first_name} ${log.profiles.last_name}`
                            : "Unknown"}
                        </td>
                        <td>{log.activity_type.replace(/_/g, " ")}</td>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;
