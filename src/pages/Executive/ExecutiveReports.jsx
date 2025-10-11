import React, { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Dropdown,
  Badge,
  Spinner,
  Alert,
  Tabs,
  Tab,
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
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  subWeeks,
} from "date-fns";
import {
  BsFilter,
  BsCalendar,
  BsDownload,
  BsArrowRepeat,
  BsGraphUp,
} from "react-icons/bs";
import { BsArrowClockwise } from "react-icons/bs";

const WeeklyReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: format(startOfWeek(new Date()), "yyyy-MM-dd"),
    end: format(endOfWeek(new Date()), "yyyy-MM-dd"),
  });
  const [teamFilter, setTeamFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [teams, setTeams] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [projects, setProjects] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState({
    tasks: [],
    projects: [],
    teamPerformance: [],
    statusDistribution: [],
    weeklyTrends: [],
  });

  // Fetch teams and projects for filters
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch teams
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id, name")
          .order("name");

        if (teamsError) throw teamsError;
        setTeams(teamsData || []);

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, name, team_id")
          .order("name");

        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
      } catch (err) {
        setError("Failed to load filter data: " + err.message);
      }
    };

    fetchInitialData();
  }, []);

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
      pdf.text("Weekly Report", margin, yPos);
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
          value: reportData.tasks.length,
          color: [66, 133, 244],
        },
        {
          label: "Completed",
          value: reportData.statusDistribution.find(s => s.name === "Completed")?.value || 0,
          color: [52, 168, 83],
        },
        {
          label: "In Progress",
          value: reportData.statusDistribution.find(s => s.name === "In Progress")?.value || 0,
          color: [0, 136, 254],
        },
        {
          label: "To Do",
          value: reportData.statusDistribution.find(s => s.name === "To Do")?.value || 0,
          color: [251, 188, 5],
        },
        {
          label: "On Hold",
          value: reportData.statusDistribution.find(s => s.name === "On Hold")?.value || 0,
          color: [255, 187, 40],
        },
        {
          label: "Cancelled",
          value: reportData.statusDistribution.find(s => s.name === "Cancelled")?.value || 0,
          color: [234, 67, 53],
        },
      ];

      let xOffset = margin + 5;
      let row = 0;
      summaryData.forEach((item, idx) => {
        if (idx % 3 === 0 && idx > 0) {
          row++;
          xOffset = margin + 5;
          yPos += 20; // Move to next row if needed, but since height is 35, adjust if more
        }
        pdf.setTextColor(...item.color);
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(16);
        pdf.text(String(item.value), xOffset, yPos + 18 + row * 10); // Adjust for rows if needed

        pdf.setTextColor(100);
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);
        pdf.text(item.label, xOffset, yPos + 25 + row * 10);

        xOffset += contentWidth / 3;
      });

      yPos += 42;

      // Status Distribution
      checkAddPage(50);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Task Status Breakdown", margin, yPos);
      yPos += 7;

      const statusData = reportData.statusDistribution;
      const barHeight = 8;
      const totalTasks = statusData.reduce((sum, s) => sum + s.value, 0);

      const statusColors = {
        "To Do": [136, 132, 216], // purple
        "In Progress": [0, 136, 254], // blue
        "On Hold": [255, 187, 40], // yellow
        "Cancelled": [255, 128, 66], // orange
        "Completed": [0, 196, 159], // green
      };

      statusData.forEach((status) => {
        if (status.value === 0) return;

        const percentage = totalTasks > 0 ? (status.value / totalTasks) * 100 : 0;
        const barWidth = (contentWidth - 60) * (percentage / 100);

        // Color for bar
        const color = statusColors[status.name] || [150, 150, 150];

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
      checkAddPage(50);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Task Priority Breakdown", margin, yPos);
      yPos += 7;

      const priorityData = reportData.priorityDistribution;
      const priorityColors = {
        "Critical": [234, 67, 53], // red
        "High": [255, 128, 66], // orange
        "Medium": [0, 136, 254], // blue
        "Low": [150, 150, 150], // grey
      };

      priorityData.forEach((priority) => {
        if (priority.value === 0) return;

        const percentage = totalTasks > 0 ? (priority.value / totalTasks) * 100 : 0;
        const barWidth = (contentWidth - 60) * (percentage / 100);

        // Color for bar
        const color = priorityColors[priority.name] || [150, 150, 150];

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

      yPos += 5;

      // Weekly Trends
      checkAddPage(50);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Weekly Task Trends", margin, yPos);
      yPos += 7;

      const trendData = reportData.weeklyTrends;
      const maxTasks = Math.max(...trendData.map(t => t.tasks), 1);
      const barWidth = contentWidth / trendData.length - 10;

      trendData.forEach((trend, index) => {
        const height = (trend.tasks / maxTasks) * 20; // Max bar height 20mm

        pdf.setFillColor(136, 132, 216); // purple
        pdf.rect(margin + index * (barWidth + 10), yPos + 20 - height, barWidth, height, "F");

        pdf.setFontSize(9);
        pdf.setTextColor(0);
        pdf.text(trend.name, margin + index * (barWidth + 10) + barWidth / 2 - 5, yPos + 25);

        pdf.text(String(trend.tasks), margin + index * (barWidth + 10) + barWidth / 2 - 3, yPos + 18 - height - 2);
      });

      yPos += 30;

      // Team Performance if available
      if (reportData.teamPerformance.length > 0) {
        checkAddPage(35);
        pdf.setFontSize(12);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(0);
        pdf.text("Team Performance", margin, yPos);
        yPos += 7;

        pdf.setFontSize(9);
        pdf.setFont(undefined, "bold");
        pdf.text("Team", margin, yPos);
        pdf.text("Total", margin + 90, yPos);
        pdf.text("Completed", margin + 120, yPos);
        pdf.text("Rate", margin + 160, yPos);
        yPos += 5;

        pdf.setFont(undefined, "normal");
        reportData.teamPerformance.forEach((team) => {
          const completionRate = team.total > 0 ? ((team.completed / team.total) * 100).toFixed(0) : 0;

          pdf.text(
            team.name.length > 25 ? team.name.substring(0, 25) + "..." : team.name,
            margin,
            yPos
          );
          pdf.text(String(team.total), margin + 90, yPos);
          pdf.text(String(team.completed), margin + 120, yPos);
          pdf.text(`${completionRate}%`, margin + 160, yPos);

          yPos += 5;
        });

        yPos += 5;
      }

      // Project Performance
      checkAddPage(35);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Project Performance", margin, yPos);
      yPos += 7;

      pdf.setFontSize(9);
      pdf.setFont(undefined, "bold");
      pdf.text("Project", margin, yPos);
      pdf.text("Total", margin + 90, yPos);
      pdf.text("Completed", margin + 120, yPos);
      pdf.text("Progress", margin + 160, yPos);
      yPos += 5;

      pdf.setFont(undefined, "normal");
      reportData.projectProgress.forEach((project) => {
        pdf.text(
          project.name.length > 25 ? project.name.substring(0, 25) + "..." : project.name,
          margin,
          yPos
        );
        pdf.text(String(project.total), margin + 90, yPos);
        pdf.text(String(project.completed), margin + 120, yPos);
        pdf.text(`${Math.round(project.progress)}%`, margin + 160, yPos);

        yPos += 5;
      });

      yPos += 5;

      // Task List Summary Table
      checkAddPage(60);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Task Details Summary", margin, yPos);
      yPos += 7;

      // Table headers
      pdf.setFontSize(8);
      pdf.setFont(undefined, "bold");
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, yPos - 4, contentWidth, 6, "F");

      pdf.text("Task", margin + 2, yPos);
      pdf.text("Project", margin + 50, yPos);
      pdf.text("Status", margin + 90, yPos);
      pdf.text("Priority", margin + 120, yPos);
      pdf.text("Due Date", margin + 150, yPos);
      pdf.text("Assigned", margin + 175, yPos);

      yPos += 6;

      // Table rows
      pdf.setFont(undefined, "normal");
      let rowCount = 0;
      const maxRows = 25; // Limit rows per report

      // Sort tasks by priority (1 highest) then status
      const sortedTasks = [...reportData.tasks].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.status.localeCompare(b.status);
      });

      sortedTasks.slice(0, maxRows).forEach((task, idx) => {
        checkAddPage(10);

        if (idx % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPos - 4, contentWidth, 6, "F");
        }

        pdf.setTextColor(0);
        const taskName = task.title.length > 15 ? task.title.substring(0, 15) + "..." : task.title;
        pdf.text(taskName, margin + 2, yPos);

        const projectName = task.project?.name || "N/A";
        pdf.text(
          projectName.length > 15 ? projectName.substring(0, 15) + "..." : projectName,
          margin + 50,
          yPos
        );

        const statusColors = {
          "todo": [150, 150, 150],
          "in_progress": [0, 136, 254],
          "on_hold": [255, 187, 40],
          "cancelled": [234, 67, 53],
          "Completed": [52, 168, 83],
        };
        pdf.setTextColor(...(statusColors[task.status] || [0, 0, 0]));
        pdf.text(task.status.replace("_", " "), margin + 90, yPos);

        pdf.setTextColor(0);
        const priorityMap = {
          1: "Critical",
          2: "High",
          3: "Medium",
          4: "Low"
        };
        pdf.text(priorityMap[task.priority] || "N/A", margin + 120, yPos);

        const dueDate = task.due_date ? format(new Date(task.due_date), "MMM d") : "N/A";
        pdf.text(dueDate, margin + 150, yPos);

        const assigned = task.assignments?.map(a => a.profiles ? `${a.profiles.first_name[0]}.${a.profiles.last_name[0]}.` : "U").join(", ") || "Unassigned";
        pdf.text(
          assigned.length > 10 ? assigned.substring(0, 10) + "..." : assigned,
          margin + 175,
          yPos
        );

        yPos += 6;
        rowCount++;
      });

      if (reportData.tasks.length > maxRows) {
        yPos += 3;
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.setFont(undefined, "italic");
        pdf.text(
          `Showing ${maxRows} of ${reportData.tasks.length} tasks. View dashboard for complete list.`,
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
          "Weekly Reports Dashboard",
          margin,
          pageHeight - 10
        );
      }

      const fileName = `Weekly-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF Export Error:", error);
      setError("Failed to generate PDF: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  // Fetch report data
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build the base query for tasks
        let tasksQuery = supabase
          .from("tasks")
          .select(
            `
            id,
            title,
            status,
            priority,
            due_date,
            created_at,
            project_id,
            project:projects (name, team_id),
            assignments:task_assignments (user_id, profiles (first_name, last_name))
          `
          )
          .gte("created_at", `${dateRange.start}T00:00:00`)
          .lte("created_at", `${dateRange.end}T23:59:59`);

        // Apply filters
        if (teamFilter !== "all") {
          tasksQuery = tasksQuery.eq("project.team_id", teamFilter);
        }

        if (projectFilter !== "all") {
          tasksQuery = tasksQuery.eq("project_id", projectFilter);
        }

        const { data: tasksData, error: tasksError } = await tasksQuery;

        if (tasksError) throw tasksError;

        // Process the data for visualizations
        processReportData(tasksData || []);
      } catch (err) {
        setError("Failed to load report data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (dateRange.start && dateRange.end) {
      fetchReportData();
    }
  }, [dateRange, teamFilter, projectFilter]);

  const processReportData = (tasks) => {
    // Status distribution - UPDATED to include on_hold and cancelled
    const statusDistribution = [
      { name: "To Do", value: tasks.filter((t) => t.status === "todo").length },
      {
        name: "In Progress",
        value: tasks.filter((t) => t.status === "in_progress").length,
      },
      {
        name: "On Hold",
        value: tasks.filter((t) => t.status === "on_hold").length,
      },
      {
        name: "Cancelled",
        value: tasks.filter((t) => t.status === "cancelled").length,
      },
      {
        name: "Completed",
        value: tasks.filter((t) => t.status === "Completed").length,
      },
    ];

    // Priority distribution
    const priorityDistribution = [
      { name: "Critical", value: tasks.filter((t) => t.priority === 1).length },
      { name: "High", value: tasks.filter((t) => t.priority === 2).length },
      { name: "Medium", value: tasks.filter((t) => t.priority === 3).length },
      { name: "Low", value: tasks.filter((t) => t.priority === 4).length },
    ];

    // Weekly trends (tasks created by day)
    const daysInWeek = eachDayOfInterval({
      start: new Date(dateRange.start),
      end: new Date(dateRange.end),
    });

    const weeklyTrends = daysInWeek.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      return {
        name: format(day, "EEE"),
        date: dayStr,
        tasks: tasks.filter((t) => t.created_at.startsWith(dayStr)).length,
      };
    });

    // Team performance (if team filter isn't applied)
    let teamPerformance = [];
    if (teamFilter === "all") {
      teamPerformance = teams
        .map((team) => {
          const teamTasks = tasks.filter((t) => t.project?.team_id === team.id);
          return {
            name: team.name,
            completed: teamTasks.filter((t) => t.status === "Completed").length,
            total: teamTasks.length,
          };
        })
        .filter((team) => team.total > 0);
    }

    // Project progress
    const projectProgress = projects
      .map((project) => {
        const projectTasks = tasks.filter((t) => t.project_id === project.id);
        return {
          name: project.name,
          completed: projectTasks.filter((t) => t.status === "Completed")
            .length,
          total: projectTasks.length,
          progress:
            projectTasks.length > 0
              ? (projectTasks.filter((t) => t.status === "Completed").length /
                  projectTasks.length) *
                100
              : 0,
        };
      })
      .filter((project) => project.total > 0)
      .sort((a, b) => b.progress - a.progress);

    setReportData({
      tasks,
      statusDistribution,
      priorityDistribution,
      weeklyTrends,
      teamPerformance,
      projectProgress,
    });
  };

  const handleDateRangeChange = (range) => {
    let start, end;
    const today = new Date();

    switch (range) {
      case "thisWeek":
        start = startOfWeek(today);
        end = endOfWeek(today);
        break;
      case "lastWeek":
        start = startOfWeek(subWeeks(today, 1));
        end = endOfWeek(subWeeks(today, 1));
        break;
      case "custom":
      default:
        return; // Custom handled separately
    }

    setDateRange({
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    });
  };

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="custom-tooltip p-2"
          style={{ backgroundColor: "#fff", border: "1px solid #ccc" }}
        >
          <p className="label mb-1">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="mb-0" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart to prevent overlapping
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
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

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="mb-3" />
          <p>Loading report data...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div id="weekly-report-content">
        <Row className="mb-4">
          <Col>
            <h2 className="d-flex align-items-center">
              <BsGraphUp className="me-2" /> Weekly Reports
            </h2>
            <p className="text-muted">
              Analytics for {format(new Date(dateRange.start), "MMM d, yyyy")} -{" "}
              {format(new Date(dateRange.end), "MMM d, yyyy")}
            </p>
          </Col>
          <Col xs="auto">
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <BsArrowRepeat className="me-1" /> Refresh
              </Button>
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
        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center">
                    <BsCalendar className="me-1" /> Date Range
                  </Form.Label>
                  <Form.Select
                    value={`${dateRange.start} to ${dateRange.end}`}
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                  >
                    <option value="thisWeek">This Week</option>
                    <option value="lastWeek">Last Week</option>
                    <option value="custom">Custom Range</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center">
                    <BsFilter className="me-1" /> Team
                  </Form.Label>
                  <Form.Select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                  >
                    <option value="all">All Teams</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Project</Form.Label>
                  <Form.Select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                  >
                    <option value="all">All Projects</option>
                    {projects
                      .filter(
                        (p) => teamFilter === "all" || p.team_id === teamFilter
                      )
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Custom Date Range</Form.Label>
                  <div className="d-flex gap-1">
                    <Form.Control
                      type="date"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, start: e.target.value })
                      }
                      style={{ fontSize: "0.875rem" }}
                    />
                    <Form.Control
                      type="date"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, end: e.target.value })
                      }
                      style={{ fontSize: "0.875rem" }}
                    />
                  </div>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Summary Cards - UPDATED to include all statuses */}
        <Row className="mb-4">
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3>{reportData.tasks.length}</h3>
                <Card.Text>Total Tasks</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">
                  {reportData.statusDistribution.find(
                    (s) => s.name === "Completed"
                  )?.value || 0}
                </h3>
                <Card.Text>Completed</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">
                  {reportData.statusDistribution.find(
                    (s) => s.name === "In Progress"
                  )?.value || 0}
                </h3>
                <Card.Text>In Progress</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-warning">
                  {reportData.statusDistribution.find((s) => s.name === "To Do")
                    ?.value || 0}
                </h3>
                <Card.Text>To Do</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">
                  {reportData.statusDistribution.find(
                    (s) => s.name === "On Hold"
                  )?.value || 0}
                </h3>
                <Card.Text>On Hold</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-secondary">
                  {reportData.statusDistribution.find(
                    (s) => s.name === "Cancelled"
                  )?.value || 0}
                </h3>
                <Card.Text>Cancelled</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
        >
          <Tab eventKey="overview" title="Overview">
            <Row>
              <Col md={6} className="mb-4">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Task Status Distribution</h5>
                  </Card.Header>
                  <Card.Body>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.statusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.statusDistribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
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
              <Col md={6} className="mb-4">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Task Priority Distribution</h5>
                  </Card.Header>
                  <Card.Body>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.priorityDistribution}>
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
              <Col md={12} className="mb-4">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Weekly Task Trends</h5>
                  </Card.Header>
                  <Card.Body>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={reportData.weeklyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="tasks"
                          stroke="#8884d8"
                          fill="#8884d8"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="performance" title="Team Performance">
            <Row>
              <Col md={6} className="mb-4">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Team Completion Rates</h5>
                  </Card.Header>
                  <Card.Body>
                    {reportData.teamPerformance.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.teamPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="Completed"
                            fill="#00C49F"
                            name="Completed"
                          />
                          <Bar
                            dataKey="total"
                            fill="#8884d8"
                            name="Total Tasks"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-5 text-muted">
                        No team performance data available for the selected
                        filters.
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} className="mb-4">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Project Progress</h5>
                  </Card.Header>
                  <Card.Body>
                    {reportData.projectProgress.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={[...reportData.projectProgress].sort(
                            (a, b) => b.progress - a.progress
                          )}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis type="category" dataKey="name" width={100} />
                          <Tooltip
                            formatter={(value) => [
                              `${value.toFixed(1)}%`,
                              "Progress",
                            ]}
                          />
                          <Bar
                            dataKey="progress"
                            fill="#8884d8"
                            name="Progress %"
                          >
                            {reportData.projectProgress.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.progress > 75
                                    ? "#00C49F"
                                    : entry.progress > 50
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
                        No project progress data available for the selected
                        filters.
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="details" title="Task Details">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Task List</h5>
              </Card.Header>
              <Card.Body>
                {reportData.tasks.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Project</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Due Date</th>
                          <th>Assigned To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.tasks.map((task) => (
                          <tr key={task.id}>
                            <td>{task.title}</td>
                            <td>{task.project?.name || "N/A"}</td>
                            <td>
                              <Badge
                                bg={
                                  task.status === "Completed"
                                    ? "success"
                                    : task.status === "in_progress"
                                    ? "primary"
                                    : task.status === "on_hold"
                                    ? "warning"
                                    : task.status === "cancelled"
                                    ? "danger"
                                    : "secondary"
                                }
                              >
                                {task.status}
                              </Badge>
                            </td>
                            <td>
                              <Badge
                                bg={
                                  task.priority === 1
                                    ? "danger"
                                    : task.priority === 2
                                    ? "warning"
                                    : task.priority === 3
                                    ? "info"
                                    : "secondary"
                                }
                              >
                                {task.priority === 1
                                  ? "Critical"
                                  : task.priority === 2
                                  ? "High"
                                  : task.priority === 3
                                  ? "Medium"
                                  : "Low"}
                              </Badge>
                            </td>
                            <td>
                              {task.due_date
                                ? format(new Date(task.due_date), "MMM d, yyyy")
                                : "N/A"}
                            </td>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    No tasks found for the selected filters and date range.
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </div>
    </Container>
  );
};

export default WeeklyReports;