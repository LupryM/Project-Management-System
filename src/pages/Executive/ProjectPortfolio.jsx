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
  ProgressBar,
  Pagination,
} from "react-bootstrap";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "../../lib/supabaseClient";
import {
  format,
  parseISO,
  differenceInDays,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  BsCollection,
  BsDownload,
  BsFilter,
  BsSortAlphaDown,
  BsSortAlphaUp,
} from "react-icons/bs";

const PROJECTS_PER_PAGE = 10;

const ProjectPortfolioDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [timeFrame, setTimeFrame] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const getCompletionRate = (project) => {
    const tasks = project.tasks || [];
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter((t) => t.status === "Completed").length;
    return (completedTasks / tasks.length) * 100;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select(
            `
            *,
            team:teams (id, name),
            manager:profiles!manager_id (first_name, last_name),
            tasks:tasks (id, status, priority)
            `
          )
          .order("created_at", { ascending: false });

        if (projectsError) throw projectsError;

        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id, name")
          .order("name");

        if (teamsError) throw teamsError;

        setProjects(projectsData || []);
        setTeams(teamsData || []);
        setCurrentPage(1);
      } catch (err) {
        setError("Failed to load data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      pdf.text("Project Portfolio Report", margin, yPos);
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
          label: "Total Projects",
          value: processedData.totalProjects,
          color: [66, 133, 244],
        },
        {
          label: "Completed",
          value: processedData.completedProjects,
          color: [52, 168, 83],
        },
        {
          label: "In Progress",
          value: processedData.inProgressProjects,
          color: [251, 188, 5],
        },
        {
          label: "Overdue",
          value: processedData.overdueProjects,
          color: [234, 67, 53],
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

      // Status Distribution
      checkAddPage(50);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Project Status Breakdown", margin, yPos);
      yPos += 7;

      const statusData = processedData.statusDistribution;
      const barHeight = 8;
      const totalProjects = statusData.reduce((sum, s) => sum + s.value, 0);

      statusData.forEach((status) => {
        if (status.value === 0) return;

        const percentage = totalProjects > 0 ? (status.value / totalProjects) * 100 : 0;
        const barWidth = (contentWidth - 60) * (percentage / 100);

        // Color for bar
        const colors = {
          Planned: [136, 132, 216],
          "In Progress": [0, 136, 254],
          "On Hold": [255, 187, 40],
          Completed: [0, 196, 159],
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

      // Team Performance Summary
      checkAddPage(35);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Team Performance", margin, yPos);
      yPos += 7;

      const teamData = processedData.teamDistribution.slice(0, 5); // Top 5 teams

      if (teamData.length > 0) {
        pdf.setFontSize(9);
        pdf.setFont(undefined, "bold");
        pdf.text("Team", margin, yPos);
        pdf.text("Total", margin + 90, yPos);
        pdf.text("Completed", margin + 120, yPos);
        pdf.text("Rate", margin + 160, yPos);
        yPos += 5;

        pdf.setFont(undefined, "normal");
        teamData.forEach((team) => {
          const completionRate =
            team.projects > 0 ? ((team.completed / team.projects) * 100).toFixed(0) : 0;

          pdf.text(
            team.name.length > 25 ? team.name.substring(0, 25) + "..." : team.name,
            margin,
            yPos
          );
          pdf.text(String(team.projects), margin + 90, yPos);
          pdf.text(String(team.completed), margin + 120, yPos);
          pdf.text(`${completionRate}%`, margin + 160, yPos);

          yPos += 5;
        });
      }

      yPos += 5;

      // Key Projects Summary (Top performers and at-risk)
      checkAddPage(50);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("Key Projects", margin, yPos);
      yPos += 7;

      // Top Performers
      const topProjects = processedData.filteredProjects
        .filter((p) => p.status === "completed" || getCompletionRate(p) > 75)
        .slice(0, 3);

      if (topProjects.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(52, 168, 83);
        pdf.text("⬤ Top Performers", margin, yPos);
        yPos += 5;

        pdf.setFontSize(9);
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(0);

        topProjects.forEach((project) => {
          const rate = getCompletionRate(project);
          pdf.text(
            `• ${project.name.substring(0, 40)}${project.name.length > 40 ? "..." : ""} - ${Math.round(rate)}% complete`,
            margin + 5,
            yPos
          );
          yPos += 5;
        });
      }

      yPos += 3;

      // At-Risk Projects
      const atRiskProjects = processedData.filteredProjects
        .filter((p) => {
          if (p.status === "completed") return false;
          const isOverdue = p.due_date && parseISO(p.due_date) < new Date();
          const isBehindSchedule = getCompletionRate(p) < 30;
          return isOverdue || isBehindSchedule || p.status === "on_hold";
        })
        .slice(0, 3);

      if (atRiskProjects.length > 0) {
        checkAddPage(25);
        pdf.setFontSize(10);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(234, 67, 53);
        pdf.text("⬤ Attention Required", margin, yPos);
        yPos += 5;

        pdf.setFontSize(9);
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(0);

        atRiskProjects.forEach((project) => {
          const rate = getCompletionRate(project);
          const status =
            project.status === "on_hold"
              ? "On Hold"
              : project.due_date && parseISO(project.due_date) < new Date()
              ? "Overdue"
              : "Behind Schedule";

          pdf.text(
            `• ${project.name.substring(0, 35)}${project.name.length > 35 ? "..." : ""} - ${status} (${Math.round(rate)}%)`,
            margin + 5,
            yPos
          );
          yPos += 5;
        });
      }

      yPos += 8;

      // Project List Summary Table
      checkAddPage(60);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(0);
      pdf.text("All Projects Summary", margin, yPos);
      yPos += 7;

      // Table headers
      pdf.setFontSize(8);
      pdf.setFont(undefined, "bold");
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, yPos - 4, contentWidth, 6, "F");

      pdf.text("Project", margin + 2, yPos);
      pdf.text("Team", margin + 70, yPos);
      pdf.text("Status", margin + 110, yPos);
      pdf.text("Progress", margin + 145, yPos);
      pdf.text("Due Date", margin + 170, yPos);

      yPos += 6;

      // Table rows
      pdf.setFont(undefined, "normal");
      let rowCount = 0;
      const maxRows = 25; // Limit rows per report

      processedData.filteredProjects.slice(0, maxRows).forEach((project, idx) => {
        checkAddPage(10);

        if (idx % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPos - 4, contentWidth, 6, "F");
        }

        pdf.setTextColor(0);
        const projectName =
          project.name.length > 22 ? project.name.substring(0, 22) + "..." : project.name;
        pdf.text(projectName, margin + 2, yPos);

        const teamName = project.team?.name || "Unassigned";
        pdf.text(
          teamName.length > 12 ? teamName.substring(0, 12) + "..." : teamName,
          margin + 70,
          yPos
        );

        const statusColors = {
          completed: [52, 168, 83],
          in_progress: [66, 133, 244],
          on_hold: [251, 188, 5],
          planned: [150, 150, 150],
        };
        pdf.setTextColor(...(statusColors[project.status] || [0, 0, 0]));
        pdf.text(project.status.replace("_", " "), margin + 110, yPos);

        pdf.setTextColor(0);
        const progress = Math.round(getCompletionRate(project));
        pdf.text(`${progress}%`, margin + 145, yPos);

        if (project.due_date) {
          const dueDate = format(parseISO(project.due_date), "MMM d, yyyy");
          pdf.text(dueDate, margin + 170, yPos);
        } else {
          pdf.setTextColor(150);
          pdf.text("Not set", margin + 170, yPos);
        }

        yPos += 6;
        rowCount++;
      });

      if (processedData.filteredProjects.length > maxRows) {
        yPos += 3;
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.setFont(undefined, "italic");
        pdf.text(
          `Showing ${maxRows} of ${processedData.filteredProjects.length} projects. View dashboard for complete list.`,
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
          "Project Portfolio Dashboard",
          margin,
          pageHeight - 10
        );
      }

      const fileName = `Project-Portfolio-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF Export Error:", error);
      setError("Failed to generate PDF: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  const processedData = useMemo(() => {
    let filteredProjects = projects;

    if (teamFilter !== "all") {
      filteredProjects = filteredProjects.filter(
        (project) => project.team_id === parseInt(teamFilter)
      );
    }

    const now = new Date();
    if (timeFrame === "month") {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.created_at &&
          parseISO(project.created_at) >= monthStart &&
          parseISO(project.created_at) <= monthEnd
      );
    } else if (timeFrame === "quarter") {
      const quarterStart = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1
      );
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.created_at && parseISO(project.created_at) >= quarterStart
      );
    }

    const sortedProjects = [...filteredProjects].sort((a, b) => {
      let valA, valB;

      switch (sortBy) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "team":
          valA = a.team?.name?.toLowerCase() || "";
          valB = b.team?.name?.toLowerCase() || "";
          break;
        case "status":
          valA = a.status.toLowerCase();
          valB = b.status.toLowerCase();
          break;
        case "progress":
          valA = getCompletionRate(a);
          valB = getCompletionRate(b);
          break;
        case "created_at":
        default:
          valA = parseISO(a.created_at).getTime();
          valB = parseISO(b.created_at).getTime();
          break;
      }

      if (valA < valB) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (valA > valB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });

    const statusDistribution = [
      {
        name: "Planned",
        value: sortedProjects.filter((p) => p.status === "planned").length,
        color: "#8884d8",
      },
      {
        name: "In Progress",
        value: sortedProjects.filter((p) => p.status === "in_progress").length,
        color: "#0088FE",
      },
      {
        name: "On Hold",
        value: sortedProjects.filter((p) => p.status === "on_hold").length,
        color: "#FFBB28",
      },
      {
        name: "Completed",
        value: sortedProjects.filter((p) => p.status === "completed").length,
        color: "#00C49F",
      },
    ];

    const teamDistribution = teams
      .map((team) => ({
        name: team.name,
        projects: sortedProjects.filter((p) => p.team_id === team.id).length,
        completed: sortedProjects.filter(
          (p) => p.team_id === team.id && p.status === "completed"
        ).length,
      }))
      .filter((team) => team.projects > 0);

    const timelineData = sortedProjects
      .filter((p) => p.start_date && p.due_date)
      .map((project) => {
        const start = parseISO(project.start_date);
        const end = parseISO(project.due_date);
        const today = new Date();
        const totalDuration = differenceInDays(end, start);
        const daysPassed = differenceInDays(today, start);
        const progress = Math.min(
          Math.max((daysPassed / totalDuration) * 100, 0),
          100
        );

        return {
          name: project.name,
          progress: Math.round(progress),
          status: project.status,
          isBehind: progress > 100 && project.status !== "completed",
        };
      });

    const projectTaskMetrics = sortedProjects.map((project) => {
      const tasks = project.tasks || [];
      return {
        name: project.name,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "Completed").length,
        completionRate: getCompletionRate(project),
      };
    });

    const totalProjects = sortedProjects.length;
    const completedProjects = sortedProjects.filter(
      (p) => p.status === "completed"
    ).length;
    const inProgressProjects = sortedProjects.filter(
      (p) => p.status === "in_progress"
    ).length;
    const overdueProjects = sortedProjects.filter((p) => {
      if (!p.due_date || p.status === "completed") return false;
      return parseISO(p.due_date) < new Date();
    }).length;

    return {
      statusDistribution,
      teamDistribution,
      timelineData,
      projectTaskMetrics,
      totalProjects,
      completedProjects,
      inProgressProjects,
      overdueProjects,
      filteredProjects: sortedProjects,
    };
  }, [projects, teams, timeFrame, teamFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(
    processedData.filteredProjects.length / PROJECTS_PER_PAGE
  );

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
    const endIndex = startIndex + PROJECTS_PER_PAGE;
    return processedData.filteredProjects.slice(startIndex, endIndex);
  }, [currentPage, processedData.filteredProjects]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <BsSortAlphaUp className="ms-1 align-text-bottom" />
    ) : (
      <BsSortAlphaDown className="ms-1 align-text-bottom" />
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    let items = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (totalPages >= 5) {
      if (currentPage < 3) {
        endPage = 5;
      } else if (currentPage > totalPages - 2) {
        startPage = totalPages - 4;
      }
    }

    for (let number = startPage; number <= endPage; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => handlePageChange(number)}
        >
          {number}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-center mt-3">
        <Pagination.First
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
        />
        <Pagination.Prev
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        />

        {startPage > 1 && <Pagination.Ellipsis />}

        {items}

        {endPage < totalPages && <Pagination.Ellipsis />}

        <Pagination.Next
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        />
        <Pagination.Last
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
        />
      </Pagination>
    );
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="mb-3" />
          <p>Loading portfolio data...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col md={6}>
          <h2 className="d-flex align-items-center">
            <BsCollection className="me-2" /> Project Portfolio Dashboard
          </h2>
          <p className="text-muted mb-0">
            Overview of all projects across the organization
          </p>
        </Col>
        <Col md={6} className="text-md-end mt-3 mt-md-0">
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

      <Card className="mb-4">
        <Card.Body>
          <h5 className="d-flex align-items-center mb-3">
            <BsFilter className="me-2" /> Filters & Sorting
          </h5>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label>Time Frame</Form.Label>
              <Form.Select
                value={timeFrame}
                onChange={(e) => {
                  setTimeFrame(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Time</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Team Filter</Form.Label>
              <Form.Select
                value={teamFilter}
                onChange={(e) => {
                  setTeamFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Sort By</Form.Label>
              <Form.Select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
              >
                <option value="created_at">Date Created</option>
                <option value="name">Project Name</option>
                <option value="status">Status</option>
                <option value="team">Team</option>
                <option value="progress">Progress %</option>
              </Form.Select>
              <Button
                variant="link"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="p-0 mt-2"
              >
                Order: {sortOrder === "asc" ? "Ascending" : "Descending"}
                {sortOrder === "asc" ? (
                  <BsSortAlphaUp className="ms-1" />
                ) : (
                  <BsSortAlphaDown className="ms-1" />
                )}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

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

      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-primary">{processedData.totalProjects}</h3>
              <Card.Text>Total Projects</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-success">
                {processedData.completedProjects}
              </h3>
              <Card.Text>Completed</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-warning">
                {processedData.inProgressProjects}
              </h3>
              <Card.Text>In Progress</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-danger">{processedData.overdueProjects}</h3>
              <Card.Text>Overdue</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Project Status Distribution</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={processedData.statusDistribution}
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
                    {processedData.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Projects by Team</h5>
            </Card.Header>
            <Card.Body>
              {processedData.teamDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processedData.teamDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="projects"
                      name="Total Projects"
                      fill="#8884d8"
                    />
                    <Bar dataKey="completed" name="Completed" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5 text-muted">
                  No team data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Project Timeline Progress</h5>
            </Card.Header>
            <Card.Body>
              {processedData.timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={processedData.timelineData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip formatter={(value) => [`${value}%`, "Progress"]} />
                    <Bar dataKey="progress" name="Progress %">
                      {processedData.timelineData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.isBehind
                              ? "#FF8042"
                              : entry.progress > 75
                              ? "#00C49F"
                              : entry.progress > 50
                              ? "#FFBB28"
                              : "#0088FE"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5 text-muted">
                  No timeline data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Task Completion by Project</h5>
            </Card.Header>
            <Card.Body>
              {processedData.projectTaskMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={processedData.projectTaskMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="completionRate"
                      name="Completion Rate %"
                      stroke="#8884d8"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5 text-muted">
                  No task data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            All Projects ({processedData.filteredProjects.length})
          </h5>
          <small className="text-muted">
            Showing {paginatedProjects.length} projects on page {currentPage} of{" "}
            {totalPages}.
          </small>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort("name")}
                    style={{ cursor: "pointer" }}
                  >
                    Project {renderSortIcon("name")}
                  </th>
                  <th
                    onClick={() => handleSort("team")}
                    style={{ cursor: "pointer" }}
                  >
                    Team {renderSortIcon("team")}
                  </th>
                  <th>Manager</th>
                  <th
                    onClick={() => handleSort("status")}
                    style={{ cursor: "pointer" }}
                  >
                    Status {renderSortIcon("status")}
                  </th>
                  <th>Tasks</th>
                  <th>Timeline</th>
                  <th
                    onClick={() => handleSort("progress")}
                    style={{ cursor: "pointer" }}
                  >
                    Progress {renderSortIcon("progress")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProjects.map((project) => {
                  const tasks = project.tasks || [];
                  const completedTasks = tasks.filter(
                    (t) => t.status === "Completed"
                  ).length;
                  const completionRate = getCompletionRate(project);

                  return (
                    <tr key={project.id}>
                      <td>
                        <strong>{project.name}</strong>
                        <br />
                        <small className="text-muted">
                          {project.description}
                        </small>
                      </td>
                      <td>{project.team?.name || "Unassigned"}</td>
                      <td>
                        {project.manager
                          ? `${project.manager.first_name} ${project.manager.last_name}`
                          : "Unassigned"}
                      </td>
                      <td>
                        <Badge
                          bg={
                            project.status === "completed"
                              ? "success"
                              : project.status === "in_progress"
                              ? "primary"
                              : project.status === "on_hold"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {project.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td>
                        {tasks.length} total
                        <br />
                        <small>{completedTasks} completed</small>
                      </td>
                      <td>
                        {project.start_date && project.due_date ? (
                          <>
                            {format(parseISO(project.start_date), "MMM d")} -{" "}
                            {format(parseISO(project.due_date), "MMM d")}
                          </>
                        ) : (
                          "Not set"
                        )}
                      </td>
                      <td>
                        <ProgressBar
                          now={completionRate}
                          variant={
                            completionRate > 75
                              ? "success"
                              : completionRate > 50
                              ? "warning"
                              : "danger"
                          }
                          style={{ height: "8px" }}
                        />
                        <small>{Math.round(completionRate)}% complete</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {processedData.filteredProjects.length === 0 && (
            <div className="text-center py-5 text-muted">
              No projects found matching your filters
            </div>
          )}
          {renderPagination()}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ProjectPortfolioDashboard;