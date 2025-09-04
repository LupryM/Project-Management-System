import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Spinner,
  Alert,
  ProgressBar,
  ListGroup,
} from "react-bootstrap";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { supabase } from "../../lib/supabaseClient";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  BsGraphUp,
  BsClock,
  BsCheckCircle,
  BsExclamationTriangle,
  BsPeople,
  BsFolder,
  BsCalendar,
  BsArrowUp,
  BsArrowDown,
} from "react-icons/bs";

const ExecutiveDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch high-level projects data
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, status, start_date, due_date")
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch high-level tasks data
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, status, priority, due_date, project_id")
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch employees data
      const { data: employeesData, error: employeesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role, status")
        .order("created_at", { ascending: false });

      if (employeesError) throw employeesError;

      setProjects(projectsData || []);
      setTasks(tasksData || []);
      setEmployees(employeesData || []);
    } catch (err) {
      setError("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(
      (p) => p.status === "in_progress"
    ).length;
    const completedProjects = projects.filter(
      (p) => p.status === "completed"
    ).length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "Completed").length;
    const overdueTasks = tasks.filter(
      (t) =>
        t.due_date &&
        parseISO(t.due_date) < new Date() &&
        t.status !== "Completed"
    ).length;

    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(
      (e) => e.status === "Active"
    ).length;

    // Project health (based on tasks completion)
    const projectHealth = projects
      .map((project) => {
        const projectTasks = tasks.filter((t) => t.project_id === project.id);
        const completed = projectTasks.filter(
          (t) => t.status === "Completed"
        ).length;
        const total = projectTasks.length;

        return {
          name: project.name,
          completion: total > 0 ? (completed / total) * 100 : 0,
          status: project.status,
        };
      })
      .filter((p) => p.completion > 0);

    // Priority distribution
    const priorityDistribution = [
      { name: "Critical", value: tasks.filter((t) => t.priority === 1).length },
      { name: "High", value: tasks.filter((t) => t.priority === 2).length },
      { name: "Medium", value: tasks.filter((t) => t.priority === 3).length },
      { name: "Low", value: tasks.filter((t) => t.priority === 4).length },
    ];

    // Upcoming deadlines (projects due in next 7 days)
    const upcomingDeadlines = projects.filter(
      (project) =>
        project.due_date &&
        differenceInDays(parseISO(project.due_date), new Date()) <= 7 &&
        differenceInDays(parseISO(project.due_date), new Date()) >= 0 &&
        project.status !== "completed"
    );

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      totalEmployees,
      activeEmployees,
      projectHealth,
      priorityDistribution,
      upcomingDeadlines,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    };
  }, [projects, tasks, employees]);

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="mb-3" />
          <p>Loading executive dashboard...</p>
        </div>
      </Container>
    );
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <Container fluid className="py-4">
      {/* Welcome Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="d-flex align-items-center">
            <BsGraphUp className="me-2" /> Executive Overview
          </h2>
          <p className="text-muted">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </Col>
      </Row>

      {error && (
        <Alert
          variant="danger"
          className="mb-4"
          onClose={() => setError(null)}
          dismissible
        >
          {error}
        </Alert>
      )}

      {/* Key Metrics */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <div className="d-flex justify-content-center align-items-center mb-2">
                <BsFolder className="text-primary me-2" size={24} />
                <h3 className="text-primary mb-0">{metrics.totalProjects}</h3>
              </div>
              <Card.Text>Total Projects</Card.Text>
              <div className="d-flex justify-content-around">
                <small className="text-success">
                  <BsArrowUp className="me-1" />
                  {metrics.activeProjects} Active
                </small>
                <small className="text-success">
                  <BsCheckCircle className="me-1" />
                  {metrics.completedProjects} Completed
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <div className="d-flex justify-content-center align-items-center mb-2">
                <BsCheckCircle className="text-success me-2" size={24} />
                <h3 className="text-success mb-0">{metrics.completedTasks}</h3>
                <small className="text-muted ms-1">
                  / {metrics.totalTasks}
                </small>
              </div>
              <Card.Text>Tasks Completed</Card.Text>
              <ProgressBar
                now={metrics.completionRate}
                variant="success"
                className="mt-2"
                style={{ height: "8px" }}
              />
              <small className="text-muted">
                {Math.round(metrics.completionRate)}% Completion Rate
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <div className="d-flex justify-content-center align-items-center mb-2">
                <BsPeople className="text-info me-2" size={24} />
                <h3 className="text-info mb-0">{metrics.activeEmployees}</h3>
                <small className="text-muted ms-1">
                  / {metrics.totalEmployees}
                </small>
              </div>
              <Card.Text>Active Team Members</Card.Text>
              <small className="text-muted">
                {Math.round(
                  (metrics.activeEmployees / metrics.totalEmployees) * 100
                )}
                % Utilization
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <div className="d-flex justify-content-center align-items-center mb-2">
                <BsExclamationTriangle
                  className="text-warning me-2"
                  size={24}
                />
                <h3 className="text-warning mb-0">{metrics.overdueTasks}</h3>
              </div>
              <Card.Text>Overdue Tasks</Card.Text>
              <small className="text-muted">Requires attention</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Project Health */}
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Project Health</h5>
            </Card.Header>
            <Card.Body>
              {metrics.projectHealth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={metrics.projectHealth}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Completion"]}
                    />
                    <Bar dataKey="completion" name="Completion %">
                      {metrics.projectHealth.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.completion > 75
                              ? "#00C49F"
                              : entry.completion > 50
                              ? "#FFBB28"
                              : "#FF8042"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5 text-muted">
                  No project data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Task Priority Distribution */}
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Task Priority Distribution</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.priorityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics.priorityDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Upcoming Deadlines */}
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0 d-flex align-items-center">
                <BsCalendar className="me-2" /> Upcoming Deadlines
              </h5>
            </Card.Header>
            <Card.Body>
              {metrics.upcomingDeadlines.length > 0 ? (
                <ListGroup variant="flush">
                  {metrics.upcomingDeadlines.map((project) => {
                    const daysUntilDue = differenceInDays(
                      parseISO(project.due_date),
                      new Date()
                    );
                    return (
                      <ListGroup.Item
                        key={project.id}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <h6 className="mb-1">{project.name}</h6>
                          <small className="text-muted">
                            Due:{" "}
                            {format(parseISO(project.due_date), "MMM d, yyyy")}
                          </small>
                        </div>
                        <Badge bg={daysUntilDue <= 3 ? "warning" : "info"}>
                          {daysUntilDue} {daysUntilDue === 1 ? "day" : "days"}
                        </Badge>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              ) : (
                <div className="text-center py-5 text-muted">
                  <BsCheckCircle className="me-2" />
                  No upcoming deadlines
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Performance Summary */}
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Performance Summary</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex flex-column gap-3">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span>Project Completion</span>
                    <span className="fw-bold">
                      {Math.round(
                        (metrics.completedProjects / metrics.totalProjects) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <ProgressBar
                    now={
                      (metrics.completedProjects / metrics.totalProjects) * 100
                    }
                    variant="success"
                  />
                </div>

                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span>Task Completion</span>
                    <span className="fw-bold">
                      {Math.round(metrics.completionRate)}%
                    </span>
                  </div>
                  <ProgressBar now={metrics.completionRate} variant="success" />
                </div>

                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span>Team Utilization</span>
                    <span className="fw-bold">
                      {Math.round(
                        (metrics.activeEmployees / metrics.totalEmployees) * 100
                      )}
                      %
                    </span>
                  </div>
                  <ProgressBar
                    now={
                      (metrics.activeEmployees / metrics.totalEmployees) * 100
                    }
                    variant="info"
                  />
                </div>

                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span>On-Time Delivery</span>
                    <span className="fw-bold">
                      {Math.round(
                        ((metrics.totalTasks - metrics.overdueTasks) /
                          metrics.totalTasks) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <ProgressBar
                    now={
                      ((metrics.totalTasks - metrics.overdueTasks) /
                        metrics.totalTasks) *
                      100
                    }
                    variant="warning"
                  />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ExecutiveDashboard;
