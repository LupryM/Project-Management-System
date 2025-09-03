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
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";

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
          .select(`
            *,
            teams (id, name),
            manager:profiles!projects_manager_id_fkey (id, first_name, last_name)
          `)
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
    const statusCounts = { planned: 0, in_progress: 0, on_hold: 0, completed: 0 };
    projectTasks.forEach((t) => {
      if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
    });
    const total = projectTasks.length;
    const completedPercent = total > 0 ? (statusCounts.completed / total) * 100 : 0;
    return { total, statusCounts, completedPercent };
  };

  if (loading)
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" /> Loading admin overview...
      </Container>
    );

  if (error)
    return (
      <Container className="text-center my-5">
        <p className="text-danger">{error}</p>
      </Container>
    );

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

  // Apply search and filters
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.manager &&
        `${p.manager.first_name} ${p.manager.last_name}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const isOverdue =
      p.due_date && new Date(p.due_date) < new Date();
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

  return (
    <Container fluid>
      <h2 className="mb-4">Admin Project Overview</h2>

      {/* Filters */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="Search by project or manager"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Dropdown as={ButtonGroup}>
            <Dropdown.Toggle variant="outline-primary">
              {statusFilter === "all" ? "All Statuses" : statusLabels[statusFilter]}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setStatusFilter("all")}>All Statuses</Dropdown.Item>
              {statusOrder.map((s) => (
                <Dropdown.Item key={s} onClick={() => setStatusFilter(s)}>
                  {statusLabels[s]}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
        <Col md={3}>
          <Form.Check
            type="checkbox"
            label="Show Overdue Only"
            checked={showOverdueOnly}
            onChange={(e) => setShowOverdueOnly(e.target.checked)}
          />
        </Col>
      </Row>

      {/* Project Cards */}
      {statusOrder.map((status) => (
        <div key={status} className="mb-4">
          {groupedProjects[status] && groupedProjects[status].length > 0 && (
            <>
              <h4 className={`text-${statusColors[status]} mb-3`}>{statusLabels[status]}</h4>
              <Row className="g-3">
                {groupedProjects[status].map((project) => {
                  const stats = getTaskStats(project.id);

                  const isOverdue =
                    project.due_date && new Date(project.due_date) < new Date();
                  const daysLeft =
                    project.due_date
                      ? Math.ceil((new Date(project.due_date) - new Date()) / (1000 * 60 * 60 * 24))
                      : null;

                  let deadlineColor = "secondary";
                  if (isOverdue) deadlineColor = "danger";
                  else if (daysLeft !== null && daysLeft < 3) deadlineColor = "warning";

                  return (
                    <Col key={project.id} md={6} lg={4}>
                      <Card
                        className={`h-100 shadow-sm border-0 ${
                          isOverdue ? "border-danger border-2" : ""
                        }`}
                      >
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <Card.Title>{project.name}</Card.Title>
                            <Badge bg={statusColors[status]}>{statusLabels[status]}</Badge>
                          </div>

                          <p>{project.description || "No description"}</p>

                          <div className="mb-2">
                            <strong>Manager:</strong>{" "}
                            {project.manager
                              ? `${project.manager.first_name} ${project.manager.last_name}`
                              : "Unassigned"}
                          </div>

                          <div className="mb-2">
                            <strong>Team:</strong> {project.teams?.name || "Unassigned"} (
                            {stats.total} tasks)
                          </div>

                          <div className="mb-2">
                            <strong>Tasks:</strong> {stats.total} total |{" "}
                            {stats.statusCounts.completed} completed | {stats.statusCounts.in_progress} in
                            progress | {stats.statusCounts.on_hold} on hold | {stats.statusCounts.planned} planned
                          </div>

                          <ProgressBar className="mb-2">
                            {Object.entries(stats.statusCounts).map(([key, count]) => {
                              if (count === 0) return null;
                              let variant =
                                key === "completed"
                                  ? "success"
                                  : key === "in_progress"
                                  ? "primary"
                                  : key === "on_hold"
                                  ? "warning"
                                  : "secondary";
                              return (
                                <ProgressBar
                                  now={(count / stats.total) * 100}
                                  variant={variant}
                                  key={key}
                                  label={`${Math.round((count / stats.total) * 100)}%`}
                                />
                              );
                            })}
                          </ProgressBar>

                          <div className="d-flex justify-content-between mt-2">
                            <small>
                              <strong>Start:</strong>{" "}
                              {project.start_date
                                ? new Date(project.start_date).toLocaleDateString()
                                : "N/A"}
                            </small>
                            <small>
                              <strong>Due:</strong>{" "}
                              <span className={`text-${deadlineColor}`}>
                                {project.due_date
                                  ? new Date(project.due_date).toLocaleDateString()
                                  : "N/A"}
                                {isOverdue && " (Overdue)"}
                              </span>
                            </small>
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
    </Container>
  );
};

export default AdminProjectOverview;
