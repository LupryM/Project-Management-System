import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Badge,
  Spinner,
  Alert,
  Table,
} from "react-bootstrap";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { supabase } from "../../lib/supabaseClient";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
  addDays,
  differenceInDays,
} from "date-fns";

import {
  BsFilter,
  BsCalendar,
  BsPeople,
  BsClock,
  BsCheckCircle,
  BsExclamationTriangle,
  BsListTask,
  BsDownload,
} from "react-icons/bs";

// Define colors for charts
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

const TaskAnalyticsReport = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: "all",
    project: "all",
    assignee: "all",
    priority: "all",
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch tasks with all related data
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(
          `
          *,
          project:projects (id, name),
          assignments:task_assignments (
            user_id,
            profiles:user_id (id, first_name, last_name)
          )
        `
        )
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");

      if (projectsError) throw projectsError;

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .order("first_name");

      if (usersError) throw usersError;

      setTasks(tasksData || []);
      setProjects(projectsData || []);
      setUsers(usersData || []);
    } catch (err) {
      setError("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Process and filter tasks for reporting
  const reportData = useMemo(() => {
    let filtered = tasks;

    // Apply project filter
    if (filters.project !== "all") {
      filtered = filtered.filter(
        (task) => task.project_id === parseInt(filters.project)
      );
    }

    // Apply assignee filter
    if (filters.assignee !== "all") {
      filtered = filtered.filter(
        (task) =>
          task.assignments &&
          task.assignments.some(
            (assignment) => assignment.user_id === filters.assignee
          )
      );
    }

    // Apply priority filter
    if (filters.priority !== "all") {
      filtered = filtered.filter(
        (task) => task.priority === parseInt(filters.priority)
      );
    }

    // Apply date range filter
    if (filters.dateRange !== "all") {
      const today = new Date();
      let startDate, endDate;

      switch (filters.dateRange) {
        case "week":
          startDate = startOfWeek(today);
          endDate = endOfWeek(today);
          break;
        case "month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        case "quarter":
          const quarter = Math.floor(today.getMonth() / 3);
          startDate = new Date(today.getFullYear(), quarter * 3, 1);
          endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
          break;
        default:
          break;
      }

      if (startDate && endDate) {
        filtered = filtered.filter(
          (task) =>
            task.created_at &&
            isAfter(parseISO(task.created_at), startDate) &&
            isBefore(parseISO(task.created_at), endDate)
        );
      }
    }

    return filtered;
  }, [tasks, filters]);

  // Calculate statistics for analytics
  const taskStats = useMemo(() => {
    const total = reportData.length;
    const completed = reportData.filter((t) => t.status === "Completed").length;
    const overdue = reportData.filter(
      (t) =>
        t.due_date &&
        isBefore(parseISO(t.due_date), new Date()) &&
        t.status !== "Completed"
    ).length;
    const dueThisWeek = reportData.filter(
      (t) =>
        t.due_date &&
        isAfter(parseISO(t.due_date), startOfWeek(new Date())) &&
        isBefore(parseISO(t.due_date), endOfWeek(new Date())) &&
        t.status !== "Completed"
    ).length;

    // Priority distribution
    const priorityDistribution = [
      {
        name: "Critical",
        value: reportData.filter((t) => t.priority === 1).length,
      },
      {
        name: "High",
        value: reportData.filter((t) => t.priority === 2).length,
      },
      {
        name: "Medium",
        value: reportData.filter((t) => t.priority === 3).length,
      },
      { name: "Low", value: reportData.filter((t) => t.priority === 4).length },
    ];

    // Status distribution (using only statuses that exist in your database)
    const statusDistribution = [
      {
        name: "To Do",
        value: reportData.filter((t) => t.status === "todo").length,
      },
      {
        name: "In Progress",
        value: reportData.filter((t) => t.status === "in_progress").length,
      },
      {
        name: "Completed",
        value: reportData.filter((t) => t.status === "Completed").length,
      },
    ];

    // Completion trend by week
    const weekStart = startOfWeek(new Date());
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weeklyTrend = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      return {
        name: format(day, "EEE"),
        completed: reportData.filter(
          (t) =>
            t.status === "Completed" &&
            t.updated_at &&
            format(parseISO(t.updated_at), "yyyy-MM-dd") === dayStr
        ).length,
        created: reportData.filter(
          (t) =>
            t.created_at &&
            format(parseISO(t.created_at), "yyyy-MM-dd") === dayStr
        ).length,
      };
    });

    // Project performance
    const projectPerformance = projects
      .map((project) => {
        const projectTasks = reportData.filter(
          (t) => t.project_id === project.id
        );
        const completedTasks = projectTasks.filter(
          (t) => t.status === "Completed"
        ).length;

        return {
          name: project.name,
          total: projectTasks.length,
          completed: completedTasks,
          completionRate:
            projectTasks.length > 0
              ? (completedTasks / projectTasks.length) * 100
              : 0,
        };
      })
      .filter((p) => p.total > 0);

    // User performance
    const userPerformance = users
      .map((user) => {
        const userTasks = reportData.filter(
          (t) =>
            t.assignments && t.assignments.some((a) => a.user_id === user.id)
        );
        const completedTasks = userTasks.filter(
          (t) => t.status === "Completed"
        ).length;

        return {
          name: `${user.first_name} ${user.last_name}`,
          total: userTasks.length,
          completed: completedTasks,
          completionRate:
            userTasks.length > 0
              ? (completedTasks / userTasks.length) * 100
              : 0,
        };
      })
      .filter((u) => u.total > 0);

    return {
      total,
      completed,
      overdue,
      dueThisWeek,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      priorityDistribution,
      statusDistribution,
      weeklyTrend,
      projectPerformance,
      userPerformance,
    };
  }, [reportData, projects, users]);

  // UI Components for visualization only
  const PriorityBadge = ({ priority }) => {
    const priorityMap = {
      1: { label: "Critical", variant: "danger" },
      2: { label: "High", variant: "warning" },
      3: { label: "Medium", variant: "info" },
      4: { label: "Low", variant: "secondary" },
    };
    const { label, variant } = priorityMap[priority] || {
      label: "Unknown",
      variant: "secondary",
    };
    return <Badge bg={variant}>{label}</Badge>;
  };

  const StatusBadge = ({ status }) => {
    const statusMap = {
      todo: { label: "To Do", variant: "secondary" },
      in_progress: { label: "In Progress", variant: "primary" },
      Completed: { label: "Completed", variant: "success" },
    };
    const { label, variant } = statusMap[status] || {
      label: "Unknown",
      variant: "secondary",
    };
    return <Badge bg={variant}>{label}</Badge>;
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="mb-3" />
          <p>Loading task analytics...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="d-flex align-items-center">
            <BsListTask className="me-2" /> Task Analytics Report
          </h2>
          <p className="text-muted">
            Comprehensive analysis of task performance and metrics
          </p>
        </Col>
        <Col xs="auto">
          <Button variant="outline-primary">
            <BsDownload className="me-2" /> Export Report
          </Button>
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

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Select
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters({ ...filters, dateRange: e.target.value })
                }
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filters.project}
                onChange={(e) =>
                  setFilters({ ...filters, project: e.target.value })
                }
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filters.assignee}
                onChange={(e) =>
                  setFilters({ ...filters, assignee: e.target.value })
                }
              >
                <option value="all">All Assignees</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value })
                }
              >
                <option value="all">All Priorities</option>
                <option value="1">Critical</option>
                <option value="2">High</option>
                <option value="3">Medium</option>
                <option value="4">Low</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{taskStats.total}</h3>
              <Card.Text>Total Tasks</Card.Text>
              <small className="text-muted">In selected period</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{taskStats.completed}</h3>
              <Card.Text>Completed</Card.Text>
              <small className="text-muted">
                {Math.round(taskStats.completionRate)}% completion rate
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">{taskStats.dueThisWeek}</h3>
              <Card.Text>Due This Week</Card.Text>
              <small className="text-muted">Pending completion</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-danger">{taskStats.overdue}</h3>
              <Card.Text>Overdue</Card.Text>
              <small className="text-muted">Past due date</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row className="mb-4">
        {/* Task Status Distribution */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Task Status Distribution</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStats.statusDistribution}
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
                    {taskStats.statusDistribution.map((entry, index) => (
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

        {/* Overdue Tasks Section */}
        <Row className="mb-4">
          <Col md={12}>
            <Card className="border-danger">
              <Card.Header className="bg-danger text-white">
                <h5 className="mb-0 d-flex align-items-center">
                  <BsExclamationTriangle className="me-2" /> Overdue Tasks (
                  {taskStats.overdue})
                </h5>
              </Card.Header>
              <Card.Body>
                {taskStats.overdue > 0 ? (
                  <div className="table-responsive">
                    <Table striped hover>
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Project</th>
                          <th>Assignee</th>
                          <th>Priority</th>
                          <th>Days Overdue</th>
                          <th>Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData
                          .filter(
                            (task) =>
                              task.due_date &&
                              isBefore(parseISO(task.due_date), new Date()) &&
                              task.status !== "Completed"
                          )
                          .map((task) => {
                            const daysOverdue = differenceInDays(
                              new Date(),
                              parseISO(task.due_date)
                            );
                            return (
                              <tr
                                key={task.id}
                                className={
                                  daysOverdue > 7
                                    ? "table-danger"
                                    : "table-warning"
                                }
                              >
                                <td>
                                  <div>
                                    <strong>{task.title}</strong>
                                    {task.description && (
                                      <div className="text-muted small">
                                        {task.description.length > 50
                                          ? `${task.description.substring(
                                              0,
                                              50
                                            )}...`
                                          : task.description}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>{task.project?.name || "No Project"}</td>
                                <td>
                                  {task.assignments &&
                                  task.assignments.length > 0
                                    ? task.assignments
                                        .map((a) =>
                                          a.profiles
                                            ? `${a.profiles.first_name} ${a.profiles.last_name}`
                                            : "Unknown"
                                        )
                                        .join(", ")
                                    : "Unassigned"}
                                </td>
                                <td>
                                  <PriorityBadge priority={task.priority} />
                                </td>
                                <td>
                                  <Badge
                                    bg={daysOverdue > 7 ? "danger" : "warning"}
                                  >
                                    {daysOverdue}{" "}
                                    {daysOverdue === 1 ? "day" : "days"}
                                  </Badge>
                                </td>
                                <td>
                                  {format(
                                    parseISO(task.due_date),
                                    "MMM d, yyyy"
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted">
                    <BsCheckCircle size={32} className="text-success mb-2" />
                    <h5>No overdue tasks!</h5>
                    <p>All tasks are either completed or not yet due.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        {/* Priority Distribution */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Task Priority Distribution</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskStats.priorityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        {/* Weekly Activity */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Weekly Task Activity</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={taskStats.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stackId="1"
                    stroke="#00C49F"
                    fill="#00C49F"
                    name="Completed"
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stackId="2"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Created"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        {/* Project Performance */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Project Performance</h5>
            </Card.Header>
            <Card.Body>
              {taskStats.projectPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={taskStats.projectPerformance}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" name="Completed" fill="#00C49F" />
                    <Bar dataKey="total" name="Total Tasks" fill="#8884d8" />
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
      </Row>

      {/* Detailed Tables */}
      <Row>
        {/* Task List Table */}
        <Col md={12} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Task Details ({reportData.length} tasks)</h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Project</th>
                      <th>Assignee</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <div>
                            <strong>{task.title}</strong>
                            {task.description && (
                              <div className="text-muted small">
                                {task.description.length > 50
                                  ? `${task.description.substring(0, 50)}...`
                                  : task.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{task.project?.name || "No Project"}</td>
                        <td>
                          {task.assignments && task.assignments.length > 0
                            ? task.assignments
                                .map((a) =>
                                  a.profiles
                                    ? `${a.profiles.first_name} ${a.profiles.last_name}`
                                    : "Unknown"
                                )
                                .join(", ")
                            : "Unassigned"}
                        </td>
                        <td>
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td>
                          <StatusBadge status={task.status} />
                        </td>
                        <td>
                          {task.due_date
                            ? format(parseISO(task.due_date), "MMM d, yyyy")
                            : "No due date"}
                        </td>
                        <td>
                          {format(parseISO(task.created_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {reportData.length === 0 && (
                <div className="text-center py-5 text-muted">
                  No tasks found matching your filters
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TaskAnalyticsReport;
