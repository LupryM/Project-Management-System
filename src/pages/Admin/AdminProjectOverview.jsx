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
  InputGroup,
  Alert,
  Modal,
  Button,
  Table,
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
  BsEye,
} from "react-icons/bs";

const AdminProjectOverview = () => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [projectTasks, setProjectTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch projects with manager and team info
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select(
            `
            *,
            teams (id, name),
            manager:profiles!projects_manager_id_fkey (id, first_name, last_name, email)
          `
          )
          .order("due_date", { ascending: true });

        if (projectError) {
          console.error("Project fetch error:", projectError);
          throw projectError;
        }

        console.log("Fetched projects:", projectData?.length || 0);
        // Normalize project status to match enum (handle unexpected cases)
        setProjects(
          projectData.map((p) => ({
            ...p,
            status:
              p.status === "cancelled" ? "Cancelled" : p.status.toLowerCase(),
          })) || []
        );

        // Fetch tasks (only status and project_id for stats)
        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .select("project_id, status");

        if (taskError) {
          console.error("Task fetch error:", taskError);
          throw taskError;
        }

        console.log("Fetched tasks:", taskData?.length || 0);
        console.log("Task data sample:", taskData?.slice(0, 3));
        // Normalize task status to match enum
        setTasks(
          taskData.map((t) => ({
            ...t,
            status: t.status === "completed" ? "Completed" : t.status,
          })) || []
        );
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load admin overview: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch detailed tasks for a specific project
  const fetchProjectTasks = async (projectId) => {
    try {
      setLoadingTasks(true);
      const numericProjectId = Number(projectId); // Ensure numeric ID
      console.log("Fetching tasks for project ID:", numericProjectId);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", numericProjectId)
        .order("due_date", { ascending: true });

      console.log("Fetched tasks data:", tasksData);
      console.log("Tasks error:", tasksError);

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
        throw tasksError;
      }

      // Fetch task assignments
      const taskIds = (tasksData || []).map((t) => t.id);

      if (taskIds.length > 0) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("task_assignments")
          .select(
            `
            task_id,
            user_id,
            profiles!task_assignments_user_id_fkey (id, first_name, last_name, email)
          `
          )
          .in("task_id", taskIds);

        if (assignmentsError) {
          console.error("Error fetching assignments:", assignmentsError);
        }

        // Merge assignments with tasks
        const tasksWithAssignees = (tasksData || []).map((task) => ({
          ...task,
          status: task.status === "completed" ? "Completed" : task.status,
          assignee: (assignmentsData || []).find((a) => a.task_id === task.id)
            ?.profiles || null,
        }));

        setProjectTasks(tasksWithAssignees);
      } else {
        setProjectTasks(tasksData || []);
      }
    } catch (err) {
      console.error("Error fetching project tasks:", err);
      setProjectTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Task stats for projects
  const getTaskStats = (projectId) => {
    const projectTasks = tasks.filter((t) => t.project_id === projectId);
    const statusCounts = {
      todo: 0,
      in_progress: 0,
      on_hold: 0,
      Completed: 0, // Match task_status enum
      cancelled: 0,
    };
    projectTasks.forEach((t) => {
      if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
    });
    const total = projectTasks.length;
    const activeTasks = projectTasks.filter((t) => t.status !== "cancelled").length;
    const completedPercent =
      activeTasks > 0 ? (statusCounts.Completed / activeTasks) * 100 : 0;
    return { total, activeTasks, statusCounts, completedPercent };
  };

  // Status definitions for UI (match enums)
  const statusOrder = ["planned", "in_progress", "on_hold", "completed"]; // Project statuses (lowercase)
  const statusLabels = {
    planned: "Planned",
    in_progress: "In Progress",
    on_hold: "On Hold",
    completed: "Completed", // Project status
    Cancelled: "Cancelled", // Project status
    todo: "To Do",
    Completed: "Completed", // Task status
    cancelled: "Cancelled", // Task status
  };
  const statusColors = {
    planned: "secondary",
    in_progress: "primary",
    on_hold: "warning",
    completed: "success", // Project status
    Cancelled: "dark",
    todo: "secondary",
    Completed: "success", // Task status
    cancelled: "dark",
  };
  const statusIcons = {
    planned: <BsClock className="me-1" />,
    in_progress: <BsPlayCircle className="me-1" />,
    on_hold: <BsPauseCircle className="me-1" />,
    completed: <BsCheckCircle className="me-1" />, // Project status
    Cancelled: <BsExclamationTriangle className="me-1" />,
  };

  const taskStatusColors = {
    todo: "secondary",
    in_progress: "primary",
    on_hold: "warning",
    Completed: "success", // Task status
    cancelled: "dark",
  };

  const taskPriorityColors = {
    low: "success",
    medium: "warning",
    high: "danger",
  };

  // Apply search and filters - exclude cancelled projects
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
    const isNotCancelled = p.status !== "Cancelled";
    return matchesSearch && matchesStatus && matchesOverdue && isNotCancelled;
  });

  // Group filtered projects by status
  const groupedProjects = filteredProjects.reduce((acc, proj) => {
    const status = proj.status || "planned";
    if (!acc[status]) acc[status] = [];
    acc[status].push(proj);
    return acc;
  }, {});

  const viewProjectDetails = (project) => {
    console.log("Viewing project ID:", project.id);
    setSelectedProject(project);
    setShowDetailsModal(true);
    fetchProjectTasks(project.id);
  };

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
                      <Card
                        className="h-100 border-0 shadow-sm project-card"
                        style={{ cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(0,0,0,0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "0 1px 3px rgba(0,0,0,0.12)";
                        }}
                        onClick={() => viewProjectDetails(project)}
                      >
                        <Card.Body className="d-flex flex-column">
                          {/* Project Header */}
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <h6 className="card-title mb-0 fw-bold">
                              {project.name}
                            </h6>
                            <Badge
                              bg={statusColors[project.status]}
                              className="d-flex align-items-center"
                            >
                              {statusIcons[project.status]}
                              {statusLabels[project.status]}
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
                              <span>
                                {stats.activeTasks} active tasks
                                {stats.total !== stats.activeTasks &&
                                  ` (${stats.total} total)`}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {stats.activeTasks > 0 && (
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
                             
                                />
                              </ProgressBar>
                              <div className="d-flex justify-content-between mt-1">
                                <small className="text-muted">
                                  {stats.statusCounts.Completed} completed
                                </small>
                                <small className="text-muted">
                                  {stats.activeTasks} active
                                </small>
                              </div>
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

                          {/* View Details Overlay */}
                          <div
                            className="position-absolute top-50 start-50 translate-middle"
                            style={{
                              opacity: 0,
                              transition: "opacity 0.2s",
                              pointerEvents: "none",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = "1";
                            }}
                          >
                            <Button variant="primary" size="sm">
                              <BsEye className="me-1" /> View Details
                            </Button>
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

      {/* Project Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>Project Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProject && (
            <div>
              {/* Project Information */}
              <Row className="mb-4">
                <Col md={8}>
                  <h4 className="mb-3">{selectedProject.name}</h4>
                  <p className="text-muted">
                    {selectedProject.description || "No description provided"}
                  </p>
                </Col>
                <Col md={4} className="text-md-end">
                  <Badge
                    bg={statusColors[selectedProject.status]}
                    className="fs-6 mb-2"
                  >
                    {statusIcons[selectedProject.status]}
                    {statusLabels[selectedProject.status]}
                  </Badge>
                  <div className="text-muted small">
                    Project ID: {selectedProject.id}
                  </div>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={6}>
                  <Card className="border-0 bg-light mb-3">
                    <Card.Body>
                      <h6 className="text-muted mb-2">
                        <BsPerson className="me-2" />
                        Project Manager
                      </h6>
                      {selectedProject.manager ? (
                        <>
                          <p className="mb-1 fw-semibold">
                            {selectedProject.manager.first_name}{" "}
                            {selectedProject.manager.last_name}
                          </p>
                          <p className="mb-0 small text-muted">
                            {selectedProject.manager.email}
                          </p>
                        </>
                      ) : (
                        <p className="mb-0">Unassigned</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 bg-light mb-3">
                    <Card.Body>
                      <h6 className="text-muted mb-2">
                        <BsPeople className="me-2" />
                        Team
                      </h6>
                      <p className="mb-0 fw-semibold">
                        {selectedProject.teams?.name || "Unassigned"}
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={4}>
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <h6 className="text-muted mb-2">
                        <BsCalendar className="me-2" />
                        Start Date
                      </h6>
                      <p className="mb-0">
                        {selectedProject.start_date
                          ? new Date(
                              selectedProject.start_date
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "N/A"}
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <h6 className="text-muted mb-2">
                        <BsCalendar className="me-2" />
                        Due Date
                      </h6>
                      <p className="mb-0">
                        {selectedProject.due_date
                          ? new Date(
                              selectedProject.due_date
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "N/A"}
                      </p>
                      {selectedProject.due_date &&
                        new Date(selectedProject.due_date) < new Date() && (
                          <Badge bg="danger" className="mt-2">
                            <BsExclamationTriangle className="me-1" />
                            Overdue
                          </Badge>
                        )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <h6 className="text-muted mb-2">
                        <BsListCheck className="me-2" />
                        Task Progress
                      </h6>
                      <p className="mb-0">
                        {getTaskStats(selectedProject.id).statusCounts.Completed}{" "}
                        of {getTaskStats(selectedProject.id).activeTasks}{" "}
                        completed
                      </p>
                      {getTaskStats(selectedProject.id).activeTasks > 0 && (
                        <ProgressBar
                          now={
                            getTaskStats(selectedProject.id).completedPercent
                          }
                          variant="success"
                          className="mt-2"
                          style={{ height: "8px" }}
                        />
                      )}
                      {getTaskStats(selectedProject.id).total !==
                        getTaskStats(selectedProject.id).activeTasks && (
                        <small className="text-muted d-block mt-1">
                          ({getTaskStats(selectedProject.id).total} total tasks)
                        </small>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Tasks Table */}
              <h5 className="mb-3">
                <BsListCheck className="me-2" />
                Project Tasks
              </h5>
              {loadingTasks ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading tasks...
                </div>
              ) : projectTasks.length === 0 ? (
                <Alert variant="info">
                  No tasks found for this project.{" "}
                  <strong>Debugging Steps:</strong> Check the console for logs (
                  <code>Fetching tasks for project ID</code> and{" "}
                  <code>Fetched tasks data</code>). Run{" "}
                  <code>SELECT * FROM tasks WHERE project_id = {selectedProject.id};</code>{" "}
                  in Supabase SQL Editor to verify tasks exist. Ensure tasks have
                  the correct <code>project_id</code>.
                </Alert>
              ) : (
                <Table responsive hover>
                  <thead className="bg-light">
                    <tr>
                      <th>Task Name</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Assignee</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectTasks.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <div className="fw-semibold">{task.title}</div>
                          {task.description && (
                            <div
                              className="text-muted small text-truncate"
                              style={{ maxWidth: "300px" }}
                            >
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <Badge bg={taskStatusColors[task.status]}>
                            {statusLabels[task.status]}
                          </Badge>
                        </td>
                        <td>
                          {task.priority && (
                            <Badge
                              bg={taskPriorityColors[task.priority]}
                              className="text-capitalize"
                            >
                              {task.priority}
                            </Badge>
                          )}
                        </td>
                        <td>
                          {task.assignee ? (
                            <div>
                              <div className="fw-semibold small">
                                {task.assignee.first_name}{" "}
                                {task.assignee.last_name}
                              </div>
                              <div
                                className="text-muted"
                                style={{ fontSize: "0.75rem" }}
                              >
                                {task.assignee.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">Unassigned</span>
                          )}
                        </td>
                        <td>
                          {task.due_date ? (
                            <>
                              {new Date(task.due_date).toLocaleDateString()}
                              {new Date(task.due_date) < new Date() &&
                                task.status !== "Completed" && (
                                  <Badge bg="danger" className="ms-2">
                                    Overdue
                                  </Badge>
                                )}
                            </>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDetailsModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminProjectOverview;