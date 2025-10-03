import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  ProgressBar,
  Spinner,
  Form,
  Dropdown,
  ButtonGroup,
  InputGroup,
  Alert,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import {
  BsSearch,
  BsFilter,
  BsCalendar,
  BsPerson,
  BsPeople,
  BsListCheck,
  BsClock,
  BsPlayCircle,
  BsPauseCircle,
  BsCheckCircle,
  BsExclamationTriangle,
  BsThreeDotsVertical,
} from "react-icons/bs";

const AdminProjectOverview = () => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Projects with manager and team info
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select(
            `
            *,
            teams (id, name),
            manager:profiles!projects_manager_id_fkey (id, first_name, last_name)
          `
          )
          .order("due_date", { ascending: true });
        if (projectError) throw projectError;
        setProjects(projectData || []);

        // Tasks (only status and project_id for stats)
        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .select("project_id, status");
        if (taskError) throw taskError;
        setTasks(taskData || []);
      } catch (err) {
        console.error("Error fetching data:", err.message);
        setError("Failed to load admin overview: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Task stats
  const getTaskStats = (projectId) => {
    const projectTasks = tasks.filter((t) => t.project_id === projectId);
    const statusCounts = {
      planned: 0,
      in_progress: 0,
      on_hold: 0,
      completed: 0,
    };
    projectTasks.forEach((t) => {
      if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
    });
    const total = projectTasks.length;
    const completedPercent =
      total > 0 ? (statusCounts.completed / total) * 100 : 0;
    return { total, statusCounts, completedPercent };
  };

  const statusOrder = ["planned", "in_progress", "on_hold", "completed"];
  const statusLabels = {
    planned: "Planned",
    in_progress: "In Progress",
    on_hold: "On Hold",
    completed: "Completed",
  };
  const statusColors = {
    planned: "secondary",
    in_progress: "primary",
    on_hold: "warning",
    completed: "success",
  };
  const statusIcons = {
    planned: <BsClock className="me-1" />,
    in_progress: <BsPlayCircle className="me-1" />,
    on_hold: <BsPauseCircle className="me-1" />,
    completed: <BsCheckCircle className="me-1" />,
  };

  // Apply search and filters
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.manager &&
        `${p.manager.first_name} ${p.manager.last_name}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const isOverdue = p.due_date && new Date(p.due_date) < new Date();
    const matchesOverdue = !showOverdueOnly || isOverdue;
    return matchesSearch && matchesStatus && matchesOverdue;
  });

  // Group filtered projects by status
  const groupedProjects = filteredProjects.reduce((acc, proj) => {
    const status = proj.status || "planned";
    if (!acc[status]) acc[status] = [];
    acc[status].push(proj);
    return acc;
  }, {});

  if (loading)
    return (
      <Container fluid className="p-4 bg-light min-vh-100">
        <div className="text-center my-5 py-5">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <h4>Loading Admin Overview</h4>
          <p className="text-muted">
            Please wait while we load all projects...
          </p>
        </div>
      </Container>
    );

  if (error)
    return (
      <Container fluid className="p-4">
        <Alert variant="danger" className="mb-4">
          <BsExclamationTriangle className="me-2" />
          {error}
        </Alert>
      </Container>
    );

  return (
    <Container fluid className="p-4 bg-light min-vh-100">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold">
            <BsListCheck className="me-2" /> Project Overview
          </h2>
          <p className="text-muted">
            Monitor all projects across the organization
          </p>
        </Col>
      </Row>

      {/* Stats Summary */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="py-3">
              <h3 className="text-primary mb-0">{projects.length}</h3>
              <small className="text-muted">Total Projects</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="py-3">
              <h3 className="text-success mb-0">
                {projects.filter((p) => p.status === "completed").length}
              </h3>
              <small className="text-muted">Completed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="py-3">
              <h3 className="text-primary mb-0">
                {projects.filter((p) => p.status === "in_progress").length}
              </h3>
              <small className="text-muted">In Progress</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="py-3">
              <h3 className="text-warning mb-0">
                {
                  projects.filter(
                    (p) => p.due_date && new Date(p.due_date) < new Date()
                  ).length
                }
              </h3>
              <small className="text-muted">Overdue</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="py-3">
          <Row className="g-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <BsSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search projects or managers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <InputGroup>
                <InputGroup.Text>
                  <BsFilter />
                </InputGroup.Text>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  {statusOrder.map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Check
                type="switch"
                id="overdue-switch"
                label={
                  <span className="d-flex align-items-center">
                    <BsExclamationTriangle className="me-2 text-warning" />
                    Show Overdue Only
                  </span>
                }
                checked={showOverdueOnly}
                onChange={(e) => setShowOverdueOnly(e.target.checked)}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Project Cards by Status */}
      {statusOrder.map((status) => (
        <div key={status} className="mb-5">
          {groupedProjects[status] && groupedProjects[status].length > 0 && (
            <>
              <div className="d-flex align-items-center mb-3">
                <h4 className={`text-${statusColors[status]} mb-0 me-3`}>
                  {statusIcons[status]}
                  {statusLabels[status]}
                </h4>
                <Badge bg="light" text="dark" className="fs-6">
                  {groupedProjects[status].length} projects
                </Badge>
              </div>
              <Row className="g-4">
                {groupedProjects[status].map((project) => {
                  const stats = getTaskStats(project.id);
                  const isOverdue =
                    project.due_date && new Date(project.due_date) < new Date();
                  const daysLeft = project.due_date
                    ? Math.ceil(
                        (new Date(project.due_date) - new Date()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null;

                  let deadlineColor = "secondary";
                  if (isOverdue) deadlineColor = "danger";
                  else if (daysLeft !== null && daysLeft < 3)
                    deadlineColor = "warning";

                  return (
                    <Col key={project.id} md={6} lg={4} xl={3}>
                      <Card className="h-100 border-0 shadow-sm project-card">
                        <Card.Body className="d-flex flex-column">
                          {/* Project Header */}
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <h6 className="card-title mb-0 fw-bold">
                              {project.name}
                            </h6>
                            <Badge
                              bg={statusColors[status]}
                              className="d-flex align-items-center"
                            >
                              {statusIcons[status]}
                              {statusLabels[status]}
                            </Badge>
                          </div>

                          {/* Description */}
                          <p className="text-muted small flex-grow-1 mb-3">
                            {project.description || "No description provided"}
                          </p>

                          {/* Project Details */}
                          <div className="mb-3">
                            <div className="d-flex align-items-center text-muted small mb-2">
                              <BsPerson className="me-2" />
                              <span>
                                {project.manager
                                  ? `${project.manager.first_name} ${project.manager.last_name}`
                                  : "Unassigned"}
                              </span>
                            </div>

                            <div className="d-flex align-items-center text-muted small mb-2">
                              <BsPeople className="me-2" />
                              <span>{project.teams?.name || "Unassigned"}</span>
                            </div>

                            <div className="d-flex align-items-center text-muted small mb-2">
                              <BsListCheck className="me-2" />
                              <span>{stats.total} tasks total</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {stats.total > 0 && (
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <small className="text-muted">Completion</small>
                                <small className="fw-medium">
                                  {Math.round(stats.completedPercent)}%
                                </small>
                              </div>
                              <ProgressBar
                                className="rounded-pill"
                                style={{ height: "8px" }}
                              >
                                <ProgressBar
                                  now={stats.completedPercent}
                                  variant="success"
                                  label={`${Math.round(
                                    stats.completedPercent
                                  )}%`}
                                />
                              </ProgressBar>
                            </div>
                          )}

                          {/* Due Date */}
                          <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                            <small className="text-muted">
                              <BsCalendar className="me-1" />
                              Due:{" "}
                              {project.due_date
                                ? new Date(
                                    project.due_date
                                  ).toLocaleDateString()
                                : "N/A"}
                            </small>
                            {isOverdue && (
                              <Badge
                                bg="danger"
                                className="d-flex align-items-center"
                              >
                                <BsExclamationTriangle className="me-1" />
                                Overdue
                              </Badge>
                            )}
                            {daysLeft !== null &&
                              daysLeft >= 0 &&
                              daysLeft < 3 &&
                              !isOverdue && (
                                <Badge
                                  bg="warning"
                                  text="dark"
                                  className="d-flex align-items-center"
                                >
                                  <BsClock className="me-1" />
                                  {daysLeft === 0
                                    ? "Today"
                                    : `${daysLeft}d left`}
                                </Badge>
                              )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </>
          )}
        </div>
      ))}

      {/* Empty State */}
      {filteredProjects.length === 0 && projects.length > 0 && (
        <Card className="text-center py-5 border-0 shadow-sm">
          <Card.Body>
            <BsSearch size={48} className="text-muted mb-3" />
            <h4>No projects match your filters</h4>
            <p className="text-muted">
              Try adjusting your search criteria or filters
            </p>
          </Card.Body>
        </Card>
      )}

      {projects.length === 0 && !loading && (
        <Card className="text-center py-5 border-0 shadow-sm">
          <Card.Body>
            <BsListCheck size={48} className="text-muted mb-3" />
            <h4>No projects found</h4>
            <p className="text-muted">
              There are no projects in the system yet
            </p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default AdminProjectOverview;
