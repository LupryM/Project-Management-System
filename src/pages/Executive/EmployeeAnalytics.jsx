import React, { useState, useEffect, useMemo } from "react";
import { exportEmployeeAnalyticsReport } from "../../utils/reportExporter";
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
  ListGroup,
  ProgressBar,
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { supabase } from "../../lib/supabaseClient";
import {
  format,
  parseISO,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  subMonths,
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
  BsPersonCheck,
  BsPersonDash,
  BsGraphUp,
  BsChat,
  BsArrowRepeat,
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

const EmployeeAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [timeFrame, setTimeFrame] = useState("month");
  const [exporting, setExporting] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (employeesError) throw employeesError;

      // Fetch tasks with assignments
      const { data: tasksData, error: tasksError } = await supabase.from(
        "tasks"
      ).select(`
          *,
          assignments:task_assignments (user_id),
          project:projects (name)
        `);

      if (tasksError) throw tasksError;

      // Fetch activity logs (assuming you have an activity_log table)
      // If you don't have this table, we can create mock data based on task updates
      let activityLogsData = [];
      try {
        const { data: logsData, error: logsError } = await supabase
          .from("activity_log")
          .select("*")
          .order("created_at", { ascending: false });

        if (!logsError) {
          activityLogsData = logsData || [];
        }
      } catch (e) {
        console.log(
          "Activity log table not available, using task data for activities"
        );
        // Create activity data from tasks if no activity log table exists
        activityLogsData = tasksData.map((task) => ({
          id: task.id,
          user_id: task.created_by,
          activity_type: "task_created",
          description: `Created task: ${task.title}`,
          created_at: task.created_at,
        }));
      }

      setEmployees(employeesData || []);
      setTasks(tasksData || []);
      setActivityLogs(activityLogsData);
    } catch (err) {
      setError("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const labelMap = {
        week: "Last Week",
        month: "This Month",
        quarter: "This Quarter",
        all: "All Time",
      };
      const timeFrameLabel = labelMap[timeFrame] || "This Month";
      exportEmployeeAnalyticsReport(analyticsData, { timeFrameLabel });
    } catch (error) {
      console.error("Export Error:", error);
      setError("Failed to generate report: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  // Process data for analytics
  const analyticsData = useMemo(() => {
    // Filter data based on time frame
    let filteredTasks = tasks;
    let filteredActivities = activityLogs;
    let filteredEmployees = employees;

    const now = new Date();
    let startDate;

    switch (timeFrame) {
      case "week":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7
        );
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
      case "quarter":
        startDate = subMonths(now, 3);
        break;
      default:
        startDate = null;
    }

    if (startDate) {
      filteredTasks = filteredTasks.filter(
        (task) => task.created_at && parseISO(task.created_at) >= startDate
      );
      filteredActivities = filteredActivities.filter(
        (activity) =>
          activity.created_at && parseISO(activity.created_at) >= startDate
      );
    }

    // Calculate employee performance metrics
    const employeePerformance = employees.map((employee) => {
      const employeeTasks = tasks.filter(
        (task) =>
          task.assignments &&
          task.assignments.some((a) => a.user_id === employee.id)
      );

      const completedTasks = employeeTasks.filter(
        (t) => t.status === "Completed"
      );
      const overdueTasks = employeeTasks.filter(
        (t) =>
          t.due_date &&
          parseISO(t.due_date) < new Date() &&
          t.status !== "Completed"
      );

      // Calculate recent activity count
      const recentActivities = activityLogs.filter(
        (activity) =>
          activity.user_id === employee.id &&
          (!startDate ||
            (activity.created_at && parseISO(activity.created_at) >= startDate))
      ).length;

      return {
        ...employee,
        taskCount: employeeTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate:
          employeeTasks.length > 0
            ? (completedTasks.length / employeeTasks.length) * 100
            : 0,
        recentActivities,
      };
    });

    // Role distribution
    const roleDistribution = employees.reduce((acc, employee) => {
      const role = employee.role || "employee";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    // Format role distribution for chart
    const roleDistributionChart = Object.entries(roleDistribution).map(
      ([name, value]) => ({
        name,
        value,
      })
    );

    // Status distribution
    const statusDistribution = employees.reduce((acc, employee) => {
      const status = employee.status || "Active";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Format status distribution for chart
    const statusDistributionChart = Object.entries(statusDistribution).map(
      ([name, value]) => ({
        name,
        value,
      })
    );

    // Activity breakdown
    const activityBreakdown = activityLogs.reduce((acc, activity) => {
      const type = activity.activity_type || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Format activity breakdown for chart
    const activityBreakdownChart = Object.entries(activityBreakdown).map(
      ([name, value]) => ({
        name,
        value,
      })
    );

    // Top performers by completed tasks
    const topPerformers = [...employeePerformance]
      .filter((emp) => emp.taskCount > 0)
      .sort((a, b) => b.completedTasks - a.completedTasks)
      .slice(0, 10);

    // Employees with most overdue tasks
    const mostOverdue = [...employeePerformance]
      .filter((emp) => emp.overdueTasks > 0)
      .sort((a, b) => b.overdueTasks - a.overdueTasks)
      .slice(0, 10);

    // Recent onboarding (employees created in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOnboarding = employees
      .filter(
        (emp) => emp.created_at && parseISO(emp.created_at) >= thirtyDaysAgo
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Workload distribution
    const workloadData = employeePerformance
      .filter((emp) => emp.taskCount > 0)
      .map((emp) => ({
        name: `${emp.first_name} ${emp.last_name}`,
        tasks: emp.taskCount,
        completed: emp.completedTasks,
        overdue: emp.overdueTasks,
      }))
      .sort((a, b) => b.tasks - a.tasks);

    return {
      employeePerformance,
      roleDistributionChart,
      statusDistributionChart,
      activityBreakdownChart,
      topPerformers,
      mostOverdue,
      recentOnboarding,
      workloadData,
      totalEmployees: employees.length,
      activeEmployees: employees.filter((emp) => emp.status === "Active")
        .length,
      inactiveEmployees: employees.filter((emp) => emp.status !== "Active")
        .length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === "Completed").length,
    };
  }, [employees, tasks, activityLogs, timeFrame]);

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="mb-3" />
          <p>Loading employee analytics...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div id="employee-report-content">
        <Row className="mb-4">
          <Col>
            <h2 className="d-flex align-items-center">
              <BsPeople className="me-2" /> Employee Analytics Dashboard
            </h2>
            <p className="text-muted">
              Comprehensive insights into employee performance and activity
            </p>
          </Col>
          <Col xs="auto">
            <div className="d-flex gap-2">
              <Form.Select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value)}
                style={{ width: "150px" }}
              >
                <option value="week">Last Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="all">All Time</option>
              </Form.Select>
              <Button 
                variant="outline-primary" 
                onClick={exportToPDF}
                disabled={exporting || loading}
              >
                {exporting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <BsDownload className="me-2" /> Export PDF
                  </>
                )}
              </Button>
            </div>
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

        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md={3} className="mb-3">
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{analyticsData.totalEmployees}</h3>
                <Card.Text>Total Employees</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">{analyticsData.activeEmployees}</h3>
                <Card.Text>Active Employees</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-warning">
                  {analyticsData.inactiveEmployees}
                </h3>
                <Card.Text>Inactive Employees</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">{analyticsData.completedTasks}</h3>
                <Card.Text>Tasks Completed</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          {/* Role Distribution */}
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Role Distribution</h5>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.roleDistributionChart}
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
                      {analyticsData.roleDistributionChart.map((entry, index) => (
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

          {/* Status Distribution */}
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Employee Status Distribution</h5>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.statusDistributionChart}
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
                      {analyticsData.statusDistributionChart.map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>

          {/* Top Performers */}
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header>
                <h5 className="mb-0 d-flex align-items-center">
                  <BsPersonCheck className="me-2" /> Top Performers (Completed
                  Tasks)
                </h5>
              </Card.Header>
              <Card.Body>
                <ListGroup variant="flush">
                  {analyticsData.topPerformers.map((employee, index) => (
                    <ListGroup.Item
                      key={employee.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <span className="fw-bold me-2">{index + 1}.</span>
                        {employee.first_name} {employee.last_name}
                        <Badge bg="light" text="dark" className="ms-2">
                          {employee.role}
                        </Badge>
                      </div>
                      <div>
                        <Badge bg="success" className="me-2">
                          {employee.completedTasks} completed
                        </Badge>
                        <Badge bg="primary">
                          {Math.round(employee.completionRate)}%
                        </Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                {analyticsData.topPerformers.length === 0 && (
                  <div className="text-center py-3 text-muted">
                    No performance data available
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Employees with Most Overdue Tasks */}
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header className="bg-danger text-white">
                <h5 className="mb-0 d-flex align-items-center">
                  <BsExclamationTriangle className="me-2" /> Most Overdue Tasks
                </h5>
              </Card.Header>
              <Card.Body>
                <ListGroup variant="flush">
                  {analyticsData.mostOverdue.map((employee, index) => (
                    <ListGroup.Item
                      key={employee.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <span className="fw-bold me-2">{index + 1}.</span>
                        {employee.first_name} {employee.last_name}
                        <Badge bg="light" text="dark" className="ms-2">
                          {employee.role}
                        </Badge>
                      </div>
                      <Badge bg="danger">{employee.overdueTasks} overdue</Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                {analyticsData.mostOverdue.length === 0 && (
                  <div className="text-center py-3 text-success">
                    <BsCheckCircle className="me-2" />
                    No employees with overdue tasks!
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Workload Distribution */}
          <Col md={6} className="mb-4">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Workload Distribution</h5>
              </Card.Header>
              <Card.Body>
                {analyticsData.workloadData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={analyticsData.workloadData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tasks" name="Total Tasks" fill="#8884d8" />
                      <Bar dataKey="completed" name="Completed" fill="#00C49F" />
                      <Bar dataKey="overdue" name="Overdue" fill="#FF8042" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5 text-muted">
                    No workload data available
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Recent Onboarding */}
          <Col md={6} className="mb-4">
            <Card className="h-100">
              <Card.Header>
                <h5 className="mb-0 d-flex align-items-center">
                  <BsPersonDash className="me-2" /> Recent Onboarding (Last 30
                  Days)
                </h5>
              </Card.Header>
              <Card.Body
                className="p-0"
                style={{ height: "300px", overflowY: "auto" }}
              >
                <ListGroup variant="flush">
                  {analyticsData.recentOnboarding.map((employee) => (
                    <ListGroup.Item key={employee.id}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-0">
                            {employee.first_name} {employee.last_name}
                          </h6>
                          <small className="text-muted">{employee.email}</small>
                          <div>
                            <Badge bg="info" className="me-2">
                              {employee.role}
                            </Badge>
                            <Badge
                              bg={
                                employee.status === "Active"
                                  ? "success"
                                  : "secondary"
                              }
                            >
                              {employee.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-end">
                          <small className="text-muted">
                            Joined:{" "}
                            {format(parseISO(employee.created_at), "MMM d, yyyy")}
                          </small>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                {analyticsData.recentOnboarding.length === 0 && (
                  <div className="text-center py-5 text-muted">
                    No new employees in the last 30 days
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
          {/* Detailed Employee Performance Table */}
          <Col md={12} className="mb-4">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Employee Performance Details</h5>
              </Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Total Tasks</th>
                        <th>Completed</th>
                        <th>Overdue</th>
                        <th>Completion Rate</th>
                        <th>Recent Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.employeePerformance
                        .sort((a, b) => b.taskCount - a.taskCount)
                        .map((employee) => (
                          <tr key={employee.id}>
                            <td>
                              <div>
                                <strong>
                                  {employee.first_name} {employee.last_name}
                                </strong>
                                <div className="text-muted small">
                                  {employee.email}
                                </div>
                              </div>
                            </td>
                            <td>
                              <Badge bg="info">{employee.role}</Badge>
                            </td>
                            <td>
                              <Badge
                                bg={
                                  employee.status === "Active"
                                    ? "success"
                                    : "secondary"
                                }
                              >
                                {employee.status}
                              </Badge>
                            </td>
                            <td>{employee.taskCount}</td>
                            <td>
                              <span className="text-success">
                                {employee.completedTasks}
                              </span>
                            </td>
                            <td>
                              {employee.overdueTasks > 0 ? (
                                <span className="text-danger">
                                  {employee.overdueTasks}
                                </span>
                              ) : (
                                <span className="text-muted">0</span>
                              )}
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <ProgressBar
                                  now={employee.completionRate}
                                  variant={
                                    employee.completionRate > 75
                                      ? "success"
                                      : employee.completionRate > 50
                                      ? "warning"
                                      : "danger"
                                  }
                                  style={{ width: "60px", height: "8px" }}
                                  className="me-2"
                                />
                                <span>
                                  {Math.round(employee.completionRate)}%
                                </span>
                              </div>
                            </td>
                            <td>{employee.recentActivities} actions</td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

export default EmployeeAnalyticsDashboard;