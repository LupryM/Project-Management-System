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
  BsPauseCircle,
  BsXCircle,
} from "react-icons/bs";

// Define colors for charts
const COLORS = [
  "#0088FE", // Blue (To Do)
  "#00C49F", // Teal (In Progress)
  "#FFBB28", // Yellow (On Hold)
  "#FF8042", // Orange (Cancelled)
  "#8884D8", // Purple (Completed) - Replaced by a better color in JSX
];

const TaskAnalyticsReport = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [exporting, setExporting] = useState(false);
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

    // Apply filters (Project, Assignee, Priority)
    if (filters.project !== "all") {
      filtered = filtered.filter(
        (task) => task.project_id === parseInt(filters.project)
      );
    }
    if (filters.assignee !== "all") {
      filtered = filtered.filter(
        (task) =>
          task.assignments &&
          task.assignments.some(
            (assignment) => assignment.user_id === filters.assignee
          )
      );
    }
    if (filters.priority !== "all") {
      filtered = filtered.filter(
        (task) => task.priority === parseInt(filters.priority)
      );
    }

    // Apply date range filter (based on creation date)
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
      pdf.text("Task Analytics Report", margin, yPos);
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
          label: "Total Tasks",
          value: taskStats.total,
          color: [66, 133, 244],
        },
        {
          label: "Completed",
          value: taskStats.completed,
          color: [52, 168, 83],
        },
        {
          label: "Due This Week",
          value: taskStats.dueThisWeek,
          color: [251, 188, 5],
        },
        {
          label: "Overdue",
          value: taskStats.overdue,
          color: [234, 67, 53],
        },
      ];

      let xOffset = margin + 5;
      summaryData.forEach((item) => {
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

      // Task Status Breakdown
      checkAddPage(50);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Task Status Breakdown", margin, yPos);
      yPos += 7;

      const statusData = taskStats.statusDistribution;
      const barHeight = 8;

      statusData.forEach((status) => {
        if (status.value === 0) return;

        const percentage = taskStats.total > 0 ? (status.value / taskStats.total) * 100 : 0;
        const barWidth = (contentWidth - 60) * (percentage / 100);

        const colors = {
          "To Do": [0, 136, 254],
          "In Progress": [0, 196, 159],
          "On Hold": [255, 187, 40],
          "Cancelled": [255, 128, 66],
          "Completed": [136, 132, 216],
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

      // Priority Distribution
      checkAddPage(35);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Task Priority Distribution", margin, yPos);
      yPos += 7;

      taskStats.priorityDistribution.forEach((priority) => {
        if (priority.value === 0) return;

        const percentage = taskStats.total > 0 ? (priority.value / taskStats.total) * 100 : 0;
        const barWidth = (contentWidth - 60) * (percentage / 100);

        const colors = {
          Critical: [234, 67, 53],
          High: [251, 188, 5],
          Medium: [66, 133, 244],
          Low: [158, 158, 158],
        };
        const color = colors[priority.name] || [150, 150, 150];

        pdf.setFillColor(...color);
        pdf.rect(margin + 55, yPos - 5, barWidth, barHeight, "F");

        pdf.setFontSize(9);
        pdf.setTextColor(0);
        pdf.text(priority.name, margin, yPos);

        pdf.setTextColor(100);
        pdf.text(
          `${priority.value} (${percentage.toFixed(0)}%)`,
          margin + 60 + barWidth + 2,
          yPos
        );

        yPos += barHeight + 3;
      });

      yPos += 8;

      // Top 10 Overdue Tasks
      if (taskStats.overdueTasksList.length > 0) {
        checkAddPage(50);
        pdf.setFontSize(12);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(234, 67, 53);
        pdf.text(`Critical: Top 10 Overdue Tasks (Total: ${taskStats.overdue})`, margin, yPos);
        yPos += 7;

        pdf.setFontSize(8);
        pdf.setFont(undefined, "bold");
        pdf.setFillColor(255, 235, 235);
        pdf.rect(margin, yPos - 4, contentWidth, 6, "F");

        pdf.setTextColor(0);
        pdf.text("Task", margin + 2, yPos);
        pdf.text("Project", margin + 70, yPos);
        pdf.text("Priority", margin + 115, yPos);
        pdf.text("Days Late", margin + 150, yPos);

        yPos += 6;

        pdf.setFont(undefined, "normal");
        taskStats.overdueTasksList.slice(0, 10).forEach((task) => {
          checkAddPage(10);

          if (task.daysOverdue > 7) {
            pdf.setFillColor(255, 235, 235);
          } else {
            pdf.setFillColor(255, 250, 235);
          }
          pdf.rect(margin, yPos - 4, contentWidth, 6, "F");

          pdf.setTextColor(0);
          const taskName = task.title.length > 25 ? task.title.substring(0, 25) + "..." : task.title;
          pdf.text(taskName, margin + 2, yPos);

          const projectName = task.project?.name || "No Project";
          pdf.text(
            projectName.length > 15 ? projectName.substring(0, 15) + "..." : projectName,
            margin + 70,
            yPos
          );

          const priorityMap = { 1: "Critical", 2: "High", 3: "Medium", 4: "Low" };
          const priorityColors = { 1: [234, 67, 53], 2: [251, 188, 5], 3: [66, 133, 244], 4: [158, 158, 158] };
          pdf.setTextColor(...(priorityColors[task.priority] || [0, 0, 0]));
          pdf.text(priorityMap[task.priority] || "Unknown", margin + 115, yPos);

          pdf.setTextColor(task.daysOverdue > 7 ? 234 : 251, task.daysOverdue > 7 ? 67 : 188, task.daysOverdue > 7 ? 53 : 5);
          pdf.text(`${task.daysOverdue}d`, margin + 150, yPos);

          yPos += 6;
        });

        yPos += 5;
      }

      // Project Performance
      if (taskStats.projectPerformance.length > 0) {
        checkAddPage(45);
        pdf.setFontSize(12);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(0);
        pdf.text("Project Performance (Top 10)", margin, yPos);
        yPos += 7;

        pdf.setFontSize(8);
        pdf.setFont(undefined, "bold");
        pdf.setFillColor(230, 230, 230);
        pdf.rect(margin, yPos - 4, contentWidth, 6, "F");

        pdf.text("Project", margin + 2, yPos);
        pdf.text("Total", margin + 90, yPos);
        pdf.text("Completed", margin + 120, yPos);
        pdf.text("Rate", margin + 160, yPos);

        yPos += 6;

        pdf.setFont(undefined, "normal");
        taskStats.projectPerformance.slice(0, 10).forEach((project, idx) => {
          checkAddPage(10);

          if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(margin, yPos - 4, contentWidth, 6, "F");
          }

          pdf.setTextColor(0);
          const projName = project.name.length > 28 ? project.name.substring(0, 28) + "..." : project.name;
          pdf.text(projName, margin + 2, yPos);

          pdf.text(String(project.total), margin + 90, yPos);
          pdf.text(String(project.completed), margin + 120, yPos);

          const rateColor = project.completionRate > 75 ? [52, 168, 83] : project.completionRate > 50 ? [66, 133, 244] : [251, 188, 5];
          pdf.setTextColor(...rateColor);
          pdf.text(`${project.completionRate.toFixed(0)}%`, margin + 160, yPos);

          yPos += 6;
        });

        yPos += 5;
      }

      // User Performance
      if (taskStats.userPerformance.length > 0) {
        checkAddPage(45);
        pdf.setFontSize(12);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(0);
        pdf.text("User Performance (Top 10)", margin, yPos);
        yPos += 7;

        pdf.setFontSize(8);
        pdf.setFont(undefined, "bold");
        pdf.setFillColor(230, 230, 230);
        pdf.rect(margin, yPos - 4, contentWidth, 6, "F");

        pdf.text("Assignee", margin + 2, yPos);
        pdf.text("Assigned", margin + 90, yPos);
        pdf.text("Completed", margin + 120, yPos);
        pdf.text("Rate", margin + 160, yPos);

        yPos += 6;

        pdf.setFont(undefined, "normal");
        taskStats.userPerformance.slice(0, 10).forEach((user, idx) => {
          checkAddPage(10);

          if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(margin, yPos - 4, contentWidth, 6, "F");
          }

          pdf.setTextColor(0);
          const userName = user.name.length > 28 ? user.name.substring(0, 28) + "..." : user.name;
          pdf.text(userName, margin + 2, yPos);

          pdf.text(String(user.total), margin + 90, yPos);
          pdf.text(String(user.completed), margin + 120, yPos);

          const rateColor = user.completionRate > 75 ? [52, 168, 83] : user.completionRate > 50 ? [66, 133, 244] : [251, 188, 5];
          pdf.setTextColor(...rateColor);
          pdf.text(`${user.completionRate.toFixed(0)}%`, margin + 160, yPos);

          yPos += 6;
        });
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
        pdf.text("Task Analytics Report", margin, pageHeight - 10);
      }

      const fileName = `Task-Analytics-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF Export Error:", error);
      setError("Failed to generate PDF: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  // Calculate statistics for analytics
  const taskStats = useMemo(() => {
    const total = reportData.length;
    const completed = reportData.filter((t) => t.status === "Completed").length;
    
    // 1. Calculate and sort Overdue Tasks for Top 10 display
    const overdueTasksList = reportData
        .filter(
            (t) =>
                t.due_date &&
                isBefore(parseISO(t.due_date), new Date()) &&
                t.status !== "Completed" &&
                t.status !== "cancelled"
        )
        .map(task => ({
            ...task,
            // Calculate days overdue here once
            daysOverdue: differenceInDays(new Date(), parseISO(task.due_date))
        }))
        .sort((a, b) => b.daysOverdue - a.daysOverdue); // Sort descending by days overdue

    const overdue = overdueTasksList.length;

    const dueThisWeek = reportData.filter(
      (t) =>
        t.due_date &&
        isAfter(parseISO(t.due_date), startOfWeek(new Date())) &&
        isBefore(parseISO(t.due_date), endOfWeek(new Date())) &&
        t.status !== "Completed" &&
        t.status !== "cancelled"
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
    ].filter(p => p.value > 0);

    // Status distribution
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
        name: "On Hold",
        value: reportData.filter((t) => t.status === "on_hold").length,
      },
      {
        name: "Cancelled",
        value: reportData.filter((t) => t.status === "cancelled").length,
      },
      {
        name: "Completed",
        value: reportData.filter((t) => t.status === "Completed").length,
      },
    ].filter(s => s.value > 0);

    // Completion trend by week (7 days leading up to today, or current week)
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

    // Project performance (Filter and Sort)
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
      .filter((p) => p.total > 0)
      .sort((a, b) => b.completionRate - a.completionRate); // Sort descending

    // User performance (Filter and Sort)
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
      .filter((u) => u.total > 0)
      .sort((a, b) => b.completionRate - a.completionRate); // Sort descending

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
      overdueTasksList,
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

  // Custom label renderer for pie chart
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload, total }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div
          className="custom-tooltip p-2 rounded shadow-sm"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #ccc",
          }}
        >
          <p className="mb-1 fw-bold">{data.name}</p>
          <p className="mb-0">{`Tasks: ${data.value}`}</p>
          <p className="mb-0">{`Percentage: ${(
            (data.value / taskStats.total) *
            100
          ).toFixed(1)}%`}</p>
        </div>
      );
    }
    return null;
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
      {/* Header and Export Button */}
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
          <Button
            variant="primary"
            onClick={exportToPDF}
            disabled={exporting || loading}
            size="lg"
          >
            {exporting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Generating Report...
              </>
            ) : (
              <>
                <BsDownload className="me-2" /> Export Professional Report
              </>
            )}
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
                aria-label="Filter by Date Range"
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
                aria-label="Filter by Project"
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
                aria-label="Filter by Assignee"
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
                aria-label="Filter by Priority"
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

      {/* Charts Section 1 (Distribution) */}
      <Row className="mb-4">
        {/* Task Status Distribution - Pie Chart */}
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
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    innerRadius={60}
                    dataKey="value"
                  >
                    {taskStats.statusDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-status-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ paddingLeft: "20px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Priority Distribution - Bar Chart */}
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
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Overdue Tasks Section - MODIFIED TO TOP 10 */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className="border-danger">
            <Card.Header className="bg-danger text-white">
              <h5 className="mb-0 d-flex align-items-center">
                <BsExclamationTriangle className="me-2" /> Top 10 Most Overdue Tasks (Total: {taskStats.overdue})
              </h5>
            </Card.Header>
            <Card.Body>
              {taskStats.overdueTasksList.length > 0 ? (
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
                      {/* Slicing the list to only show the top 10 */}
                      {taskStats.overdueTasksList.slice(0, 10).map((task) => (
                        <tr
                          key={task.id}
                          className={
                            task.daysOverdue > 7 ? "table-danger" : "table-warning"
                          }
                        >
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
                            <Badge
                              bg={task.daysOverdue > 7 ? "danger" : "warning"}
                            >
                              {task.daysOverdue}{" "}
                              {task.daysOverdue === 1 ? "day" : "days"}
                            </Badge>
                          </td>
                          <td>
                            {format(parseISO(task.due_date), "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
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
              {/* If there are more than 10, indicate it */}
              {taskStats.overdueTasksList.length > 10 && (
                <p className="text-center text-muted small mt-3">
                  * Showing top 10 most overdue tasks out of {taskStats.overdueTasksList.length}.
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Detailed Tables - REPLACED WITH PERFORMANCE SUMMARIES */}
      <Row>
        {/* Project Performance Summary Table */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                Project Completion Rate (Top 10)
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table striped hover size="sm">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th className="text-end">Total Tasks</th>
                      <th className="text-end">Completed</th>
                      <th className="text-end">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskStats.projectPerformance.slice(0, 10).map((p) => (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td className="text-end">{p.total}</td>
                        <td className="text-end">{p.completed}</td>
                        <td className="text-end">
                          <Badge bg={p.completionRate > 75 ? "success" : p.completionRate > 50 ? "info" : "warning"}>
                            {p.completionRate.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {taskStats.projectPerformance.length > 10 && (
                <p className="text-center text-muted small mt-2">
                  * Showing top 10 projects by completion rate.
                </p>
              )}
              {taskStats.projectPerformance.length === 0 && (
                <div className="text-center py-3 text-muted">No projects found with tasks.</div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* User Performance Summary Table */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                User Completion Rate (Top 10)
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table striped hover size="sm">
                  <thead>
                    <tr>
                      <th>Assignee</th>
                      <th className="text-end">Total Assigned</th>
                      <th className="text-end">Completed</th>
                      <th className="text-end">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskStats.userPerformance.slice(0, 10).map((u) => (
                      <tr key={u.name}>
                        <td>{u.name}</td>
                        <td className="text-end">{u.total}</td>
                        <td className="text-end">{u.completed}</td>
                        <td className="text-end">
                          <Badge bg={u.completionRate > 75 ? "success" : u.completionRate > 50 ? "info" : "warning"}>
                            {u.completionRate.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {taskStats.userPerformance.length > 10 && (
                <p className="text-center text-muted small mt-2">
                  * Showing top 10 users by completion rate.
                </p>
              )}
              {taskStats.userPerformance.length === 0 && (
                <div className="text-center py-3 text-muted">No users found with assigned tasks.</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Weekly Completion/Creation Trend Chart - ADDED FOR MORE ANALYTICS VALUE */}
      <Row className="mb-4">
          <Col md={12}>
              <Card>
                  <Card.Header>
                      <h5 className="mb-0">Weekly Task Trend (Creation vs. Completion)</h5>
                  </Card.Header>
                  <Card.Body>
                      <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={taskStats.weeklyTrend}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="created" fill="#8884d8" name="Tasks Created" />
                              <Bar dataKey="completed" fill="#00C49F" name="Tasks Completed" />
                          </BarChart>
                      </ResponsiveContainer>
                  </Card.Body>
              </Card>
          </Col>
      </Row>
    </Container>
  );
};

export default TaskAnalyticsReport;