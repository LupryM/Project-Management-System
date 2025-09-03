import React, { useEffect, useState, useMemo } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Row,
  Spinner,
  ListGroup,
  Modal,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";

// Helpers
const getStatusVariant = (status) => {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "primary";
    case "on_hold":
      return "warning";
    case "planned":
      return "secondary";
    default:
      return "secondary";
  }
};

const getStatusText = (status) => {
  const map = {
    planned: "Planned",
    in_progress: "In Progress",
    on_hold: "On Hold",
    completed: "Completed",
  };
  return map[status] || status;
};

const formatDate = (dateString) =>
  dateString ? new Date(dateString).toLocaleDateString() : "—";

// ----- Component -----
export default function EmployeeProjectList() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);

        if (data.user) {
          await fetchProjects(data.user.id);
          await fetchTasks(data.user.id);
        }
      } catch (err) {
        console.error("Error fetching user:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch projects assigned to user
  const fetchProjects = async (userId) => {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        teams (name),
        manager:profiles!projects_manager_id_fkey (first_name, last_name),
        tasks!inner (id, task_assignments!inner (user_id))
      `
      )
      .eq("tasks.task_assignments.user_id", userId);

    if (!error) setProjects(data || []);
  };

  // Fetch tasks assigned to user
  const fetchTasks = async (userId) => {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        project:projects (id, name),
        task_assignments!inner (user_id)
      `
      )
      .eq("task_assignments.user_id", userId)
      .order("due_date", { ascending: true });

    if (!error) setTasks(data || []);
  };

  const getTasksForProject = (projectId) =>
    tasks.filter((t) => t.project_id === projectId);

  const handleShowModal = (project) => {
    setSelectedProject(project);
    setShowModal(true);
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProject(null);
  };

  if (loading) return <Spinner animation="border" />;

  return (
    <Container fluid>
      <Row className="mb-4 align-items-center">
        <Col>
          <h2>My Projects</h2>
          <p className="text-muted">{user?.email}</p>
        </Col>
        <Col className="text-end">
          <Button onClick={() => supabase.auth.signOut()}>Sign Out</Button>
        </Col>
      </Row>

      <Row>
        {projects.map((project) => {
          const projectTasks = getTasksForProject(project.id);
          const completedTasks = projectTasks.filter(
            (t) => t.status === "completed"
          ).length;
          const progress = projectTasks.length
            ? Math.round((completedTasks / projectTasks.length) * 100)
            : 0;

          return (
            <Col key={project.id} md={6} lg={4} className="mb-4">
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <h5>{project.name}</h5>
                    <Badge bg={getStatusVariant(project.status)}>
                      {getStatusText(project.status)}
                    </Badge>
                  </div>
                  <p>Team: {project.teams?.name || "Unassigned"}</p>
                  <p>
                    Manager:{" "}
                    {project.manager
                      ? `${project.manager.first_name} ${project.manager.last_name}`
                      : "Unassigned"}
                  </p>
                  <p>Due: {formatDate(project.due_date)}</p>
                  <p>
                    Tasks: {projectTasks.length} assigned ({completedTasks}{" "}
                    completed)
                  </p>
                  {projectTasks.length > 0 && (
                    <div className="progress mb-2" style={{ height: "8px" }}>
                      <div
                        className="progress-bar"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleShowModal(project)}
                  >
                    View Details
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedProject?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProject && (
            <>
              <p>{selectedProject.description || "No description"}</p>
              <p>Team: {selectedProject.teams?.name || "Unassigned"}</p>
              <p>
                Manager:{" "}
                {selectedProject.manager
                  ? `${selectedProject.manager.first_name} ${selectedProject.manager.last_name}`
                  : "Unassigned"}
              </p>
              <p>Due: {formatDate(selectedProject.due_date)}</p>
              <h6>Your Tasks</h6>
              <ListGroup>
                {getTasksForProject(selectedProject.id).map((task) => (
                  <ListGroup.Item key={task.id}>
                    {task.title} - {getStatusText(task.status)}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
