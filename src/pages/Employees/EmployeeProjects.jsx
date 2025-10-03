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
  ProgressBar,
  Alert,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import {
  BsFolder,
  BsPeople,
  BsPerson,
  BsCalendar,
  BsListCheck,
  BsArrowRight,
  BsBoxArrowRight,
  BsClock,
  BsPlayCircle,
  BsPauseCircle,
  BsCheckCircle,
  BsThreeDotsVertical,
  BsSearch,
  BsFilter,
} from "react-icons/bs";

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

const getStatusIcon = (status) => {
  switch (status) {
    case "completed":
      return <BsCheckCircle className="me-1" />;
    case "in_progress":
      return <BsPlayCircle className="me-1" />;
    case "on_hold":
      return <BsPauseCircle className="me-1" />;
    case "planned":
      return <BsClock className="me-1" />;
    default:
      return <BsClock className="me-1" />;
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        setUser(data.user);

        if (data.user) {
          await fetchProjects(data.user.id);
        }
      } catch (err) {
        console.error("Error fetching user:", err.message);
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch projects that the employee is assigned to, with ALL tasks in those projects
  const fetchProjects = async (userId) => {
    try {
      // First get project IDs where employee has tasks
      const { data: assignedProjects, error: projectsError } = await supabase
        .from("task_assignments")
        .select("task:tasks(project_id)")
        .eq("user_id", userId);

      if (projectsError) throw projectsError;

      const projectIds = [
        ...new Set(
          assignedProjects.map((ap) => ap.task?.project_id).filter(Boolean)
        ),
      ];

      if (projectIds.length === 0) {
        setProjects([]);
        return;
      }

      // Now get the complete projects with ALL their tasks
      const { data: projectsData, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          teams (name),
          manager:profiles!projects_manager_id_fkey (first_name, last_name),
          tasks (*)
        `
        )
        .in("id", projectIds);

      if (error) throw error;
      setProjects(projectsData || []);
    } catch (err) {
      console.error("Error fetching projects:", err.message);
      setError("Failed to load projects");
    }
  };

  // Filter projects based on search term and status filter
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter
      const matchesSearch =
        searchTerm === "" ||
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.teams?.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  // Get tasks info for a project
  const getProjectTasksInfo = (project) => {
    const allTasks = project.tasks || [];
    const employeeTasks = allTasks.filter((task) =>
      task.task_assignments?.some(
        (assignment) => assignment.user_id === user?.id
      )
    );

    return {
      allTasks,
      employeeTasks,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter((t) => t.status === "Completed").length,
      employeeTotalTasks: employeeTasks.length,
      employeeCompletedTasks: employeeTasks.filter(
        (t) => t.status === "Completed"
      ).length,
    };
  };

  const handleShowModal = (project) => {
    setSelectedProject(project);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <Container
        fluid
        className="d-flex justify-content-center align-items-center min-vh-50"
      >
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading your projects...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-1">
            <BsFolder className="me-2" /> My Projects
          </h2>
          <p className="text-muted mb-0">{user?.email}</p>
        </Col>
        <Col className="text-end"></Col>
      </Row>

      {error && (
        <Alert
          variant="danger"
          onClose={() => setError(null)}
          dismissible
          className="mb-4"
        >
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="py-3">
          <Row className="g-3">
            <Col md={6}>
              <div className="position-relative">
                <BsSearch className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="form-control ps-5"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </Col>
            <Col md={6}>
              <div className="position-relative">
                <BsFilter className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                <select
                  className="form-select ps-5"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {filteredProjects.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <BsFolder size={48} className="text-muted mb-3" />
            <h5 className="text-muted">
              {projects.length === 0
                ? "No projects assigned to you yet"
                : "No projects match your filters"}
            </h5>
            <p className="text-muted">
              {projects.length === 0
                ? "Projects assigned to you will appear here"
                : "Try changing your search or filter criteria"}
            </p>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {filteredProjects.map((project) => {
            const {
              allTasks,
              employeeTasks,
              totalTasks,
              completedTasks,
              employeeTotalTasks,
              employeeCompletedTasks,
            } = getProjectTasksInfo(project);

            const progress =
              totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0;

            return (
              <Col key={project.id} md={6} lg={4} className="mb-4">
                <Card className="h-100 project-card">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h5 className="card-title mb-0">{project.name}</h5>
                      <Badge
                        bg={getStatusVariant(project.status)}
                        className="d-flex align-items-center"
                      >
                        {getStatusIcon(project.status)}
                        {getStatusText(project.status)}
                      </Badge>
                    </div>

                    <p className="text-muted flex-grow-1">
                      {project.description || "No description available"}
                    </p>

                    <div className="mb-3">
                      <div className="d-flex align-items-center text-muted mb-2">
                        <BsPeople className="me-2" />
                        <span>Team: {project.teams?.name || "Unassigned"}</span>
                      </div>

                      <div className="d-flex align-items-center text-muted mb-2">
                        <BsPerson className="me-2" />
                        <span>
                          Manager:{" "}
                          {project.manager
                            ? `${project.manager.first_name} ${project.manager.last_name}`
                            : "Unassigned"}
                        </span>
                      </div>

                      <div className="d-flex align-items-center text-muted mb-2">
                        <BsCalendar className="me-2" />
                        <span>Due: {formatDate(project.due_date)}</span>
                      </div>

                      <div className="d-flex align-items-center text-muted mb-2">
                        <BsListCheck className="me-2" />
                        <span>
                          {employeeTotalTasks} your tasks (
                          {employeeCompletedTasks} completed)
                        </span>
                      </div>

                      <div className="d-flex align-items-center text-muted mb-2">
                        <BsListCheck className="me-2" />
                        <span>
                          {totalTasks} total tasks ({completedTasks} completed)
                        </span>
                      </div>
                    </div>

                    {totalTasks > 0 && (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="text-muted">Project Progress</small>
                          <small className="text-muted">{progress}%</small>
                        </div>
                        <ProgressBar
                          now={progress}
                          variant={getStatusVariant(project.status)}
                          className="mb-3"
                        />
                      </div>
                    )}

                    <Button
                      variant="outline-primary"
                      className="mt-auto d-flex align-items-center justify-content-center"
                      onClick={() => handleShowModal(project)}
                    >
                      View Details <BsArrowRight className="ms-1" />
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Project Details Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            <BsFolder className="me-2" /> {selectedProject?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProject && (
            <>
              <p className="text-muted">
                {selectedProject.description || "No description available"}
              </p>

              <Row className="mb-4">
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <BsPeople className="me-2 text-muted" />
                    <strong>Team:</strong>
                    <span className="ms-2">
                      {selectedProject.teams?.name || "Unassigned"}
                    </span>
                  </div>

                  <div className="d-flex align-items-center mb-2">
                    <BsPerson className="me-2 text-muted" />
                    <strong>Manager:</strong>
                    <span className="ms-2">
                      {selectedProject.manager
                        ? `${selectedProject.manager.first_name} ${selectedProject.manager.last_name}`
                        : "Unassigned"}
                    </span>
                  </div>

                  <div className="d-flex align-items-center mb-2">
                    <BsCalendar className="me-2 text-muted" />
                    <strong>Due Date:</strong>
                    <span className="ms-2">
                      {formatDate(selectedProject.due_date)}
                    </span>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <BsListCheck className="me-2 text-muted" />
                    <strong>Status:</strong>
                    <Badge
                      bg={getStatusVariant(selectedProject.status)}
                      className="ms-2 d-flex align-items-center"
                    >
                      {getStatusIcon(selectedProject.status)}
                      {getStatusText(selectedProject.status)}
                    </Badge>
                  </div>

                  {(() => {
                    const {
                      employeeTotalTasks,
                      totalTasks,
                      completedTasks,
                      employeeCompletedTasks,
                    } = getProjectTasksInfo(selectedProject);
                    return (
                      <>
                        <div className="d-flex align-items-center mb-2">
                          <strong>Your Tasks:</strong>
                          <span className="ms-2">
                            {employeeTotalTasks} assigned (
                            {employeeCompletedTasks} completed)
                          </span>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <strong>Total Tasks:</strong>
                          <span className="ms-2">
                            {totalTasks} total ({completedTasks} completed)
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </Col>
              </Row>

              <h6 className="mb-3">All Project Tasks</h6>
              {getProjectTasksInfo(selectedProject).allTasks.length > 0 ? (
                <ListGroup variant="flush">
                  {getProjectTasksInfo(selectedProject).allTasks.map((task) => (
                    <ListGroup.Item
                      key={task.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-medium">{task.title}</div>
                        <small className="text-muted">
                          Due: {formatDate(task.due_date)} | Priority:{" "}
                          {task.priority}
                        </small>
                      </div>
                      <Badge bg={getStatusVariant(task.status)}>
                        {getStatusText(task.status)}
                      </Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-3 text-muted">
                  No tasks in this project
                </div>
              )}
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
