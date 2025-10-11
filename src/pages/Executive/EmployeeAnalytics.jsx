import React, { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
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
  const [currentPage, setCurrentPage] = useState(1); // current page number
  const [rowsPerPage, setRowsPerPage] = useState(10); // number of rows per page

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

  // NEW: Professional PDF Export Function
  const exportToPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      // Helper function to add new page if needed
      const checkAddPage = (requiredSpace) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Header
      pdf.setFontSize(20);
      pdf.setFont(undefined, "bold");
      pdf.text("Employee Analytics Report", margin, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");
      pdf.setTextColor(100);
      pdf.text(
        `Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`,
        margin,
        yPos
      );
      yPos += 10;

      // Executive Summary Box
      pdf.setDrawColor(200);
      pdf.setFillColor(245, 247, 250);
      pdf.roundedRect(margin, yPos, contentWidth, 35, 2, 2, "FD");

      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Executive Summary", margin + 5, yPos + 7);

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");

      const summaryData = [
        {
          label: "Total Employees",
          value: analyticsData.totalEmployees,
          color: [66, 133, 244],
        },
        {
          label: "Active",
          value: analyticsData.activeEmployees,
          color: [52, 168, 83],
        },
        {
          label: "Inactive",
          value: analyticsData.inactiveEmployees,
          color: [251, 188, 5],
        },
        {
          label: "Completed Tasks",
          value: analyticsData.completedTasks,
          color: [0, 136, 254],
        },
      ];

      let xOffset = margin + 5;
      summaryData.forEach((item, idx) => {
        pdf.setTextColor(...item.color);
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(16);
        pdf.text(String(item.value), xOffset, yPos + 18);

        pdf.setTextColor(100);
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);
        pdf.text(item.label, xOffset, yPos + 25);

        xOffset += contentWidth / 4;
      });

      yPos += 42;

      // Role Distribution
      checkAddPage(50);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Role Distribution", margin, yPos);
      yPos += 7;

      const roleData = analyticsData.roleDistributionChart;
      const barHeight = 8;
      const totalEmployees = roleData.reduce((sum, s) => sum + s.value, 0);

      roleData.forEach((role, index) => {
        if (role.value === 0) return;

        const percentage = totalEmployees > 0 ? (role.value / totalEmployees) * 100 : 0;
        const barWidth = (contentWidth - 60) * (percentage / 100);

        // Color for bar
        const color = COLORS[index % COLORS.length];
        const rgb = hexToRgb(color);
        pdf.setFillColor(...rgb);
        pdf.rect(margin + 55, yPos - 5, barWidth, barHeight, "F");

        pdf.setFontSize(9);
        pdf.setTextColor(0);
        pdf.text(role.name, margin, yPos);

        pdf.setTextColor(100);
        pdf.text(
          `${role.value} (${percentage.toFixed(0)}%)`,
          margin + 60 + barWidth + 2,
          yPos
        );

        yPos += barHeight + 3;
      });

      yPos += 5;

      // Status Distribution
      checkAddPage(50);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Employee Status Breakdown", margin, yPos);
      yPos += 7;

      const statusData = analyticsData.statusDistributionChart;
      statusData.forEach((status, index) => {
        if (status.value === 0) return;

        const percentage = totalEmployees > 0 ? (status.value / totalEmployees) * 100 : 0;
        const barWidth = (contentWidth - 60) * (percentage / 100);

        // Color for bar
        const colors = {
          Active: [52, 168, 83],
          Inactive: [234, 67, 53],
        };
        const color = colors[status.name] || [150, 150, 150];

        pdf.setFillColor(...color);
        pdf.rect(margin + 55, yPos - 5, barWidth, barHeight, "F");

        pdf.setFontSize(9);
        pdf.setTextColor(0);
        pdf.text(status.name, margin, yPos);

        pdf.setTextColor(100);
        pdf.text(
          `${status.value} (${percentage.toFixed(0)}%)`,
          margin + 60 + barWidth + 2,
          yPos
        );

        yPos += barHeight + 3;
      });

      yPos += 5;

      // Key Employees Summary (Top performers and at-risk)
      checkAddPage(50);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Key Employees", margin, yPos);
      yPos += 7;

      // Top Performers
      const topPerformers = analyticsData.topPerformers.slice(0, 3);

      if (topPerformers.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(52, 168, 83);
        pdf.text("⬤ Top Performers", margin, yPos);
        yPos += 5;

        pdf.setFontSize(9);
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(0);

        topPerformers.forEach((employee) => {
          pdf.text(
            `• ${employee.first_name} ${employee.last_name} - ${employee.completedTasks} completed (${Math.round(employee.completionRate)}%)`,
            margin + 5,
            yPos
          );
          yPos += 5;
        });
      }

      yPos += 3;

      // Attention Required
      const atRiskEmployees = analyticsData.mostOverdue.slice(0, 3);

      if (atRiskEmployees.length > 0) {
        checkAddPage(25);
        pdf.setFontSize(10);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(234, 67, 53);
        pdf.text("⬤ Attention Required", margin, yPos);
        yPos += 5;

        pdf.setFontSize(9);
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(0);

        atRiskEmployees.forEach((employee) => {
          pdf.text(
            `• ${employee.first_name} ${employee.last_name} - ${employee.overdueTasks} overdue (${Math.round(employee.completionRate)}%)`,
            margin + 5,
            yPos
          );
          yPos += 5;
        });
      }

      yPos += 8;

      // Employee List Summary Table
      checkAddPage(60);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("All Employees Summary", margin, yPos);
      yPos += 7;

      // Table headers
      pdf.setFontSize(8);
      pdf.setFont(undefined, "bold");
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, yPos - 4, contentWidth, 6, "F");

      pdf.text("Employee", margin + 2, yPos);
      pdf.text("Role", margin + 55, yPos);
      pdf.text("Status", margin + 85, yPos);
      pdf.text("Tasks", margin + 115, yPos);
      pdf.text("Completed", margin + 135, yPos);
      pdf.text("Overdue", margin + 160, yPos);
      pdf.text("Rate", margin + 180, yPos);

      yPos += 6;

      // Table rows
      pdf.setFont(undefined, "normal");
      let rowCount = 0;
      const maxRows = 25; // Limit rows per report

      analyticsData.employeePerformance.slice(0, maxRows).forEach((employee, idx) => {
        checkAddPage(10);

        if (idx % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPos - 4, contentWidth, 6, "F");
        }

        pdf.setTextColor(0);
        const employeeName = `${employee.first_name} ${employee.last_name}`;
        pdf.text(
          employeeName.length > 20 ? employeeName.substring(0, 20) + "..." : employeeName,
          margin + 2,
          yPos
        );

        const role = employee.role || "Employee";
        pdf.text(
          role.length > 10 ? role.substring(0, 10) + "..." : role,
          margin + 55,
          yPos
        );

        const statusColors = {
          Active: [52, 168, 83],
          Inactive: [234, 67, 53],
        };
        pdf.setTextColor(...(statusColors[employee.status] || [0, 0, 0]));
        pdf.text(employee.status, margin + 85, yPos);

        pdf.setTextColor(0);
        pdf.text(String(employee.taskCount), margin + 115, yPos);
        pdf.text(String(employee.completedTasks), margin + 135, yPos);
        pdf.text(String(employee.overdueTasks), margin + 160, yPos);
        pdf.text(`${Math.round(employee.completionRate)}%`, margin + 180, yPos);

        yPos += 6;
        rowCount++;
      });

      if (analyticsData.employeePerformance.length > maxRows) {
        yPos += 3;
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.setFont(undefined, "italic");
        pdf.text(
          `Showing ${maxRows} of ${analyticsData.employeePerformance.length} employees. View dashboard for complete list.`,
          margin,
          yPos
        );
      }

      // Footer on all pages
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        pdf.text(
          "Employee Analytics Dashboard",
          margin,
          pageHeight - 10
        );
      }

      const fileName = `Employee-Analytics-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF Export Error:", error);
      setError("Failed to generate PDF: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

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
    }).sort((a, b) => b.completionRate - a.completionRate); // Sort by completion rate descending

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
                  <BsDownload className="me-2" /> Export Professional Report
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
              <h3 className="text-success">
                {analyticsData.activeEmployees}
              </h3>
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
                    {analyticsData.roleDistributionChart.map(
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
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      fill="#00C49F"
                    />
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
                          {format(
                            parseISO(employee.created_at),
                            "MMM d, yyyy"
                          )}
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
        {/* Detailed Employee Performance Table with Pagination */}
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
                      <th>#</th>
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
                      .slice(
                        (currentPage - 1) * rowsPerPage,
                        currentPage * rowsPerPage
                      )
                      .map((employee, idx) => (
                        <tr key={employee.id}>
                          <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
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

              {/* Pagination Controls */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <Button
                  variant="secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {currentPage} of{" "}
                  {Math.ceil(
                    analyticsData.employeePerformance.length / rowsPerPage
                  )}
                </span>
                <Button
                  variant="secondary"
                  disabled={
                    currentPage ===
                    Math.ceil(
                      analyticsData.employeePerformance.length / rowsPerPage
                    )
                  }
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeAnalyticsDashboard;