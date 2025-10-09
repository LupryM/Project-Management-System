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
  Badge,
  Spinner,
  Alert,
  ProgressBar,
  ListGroup,
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
  BsFilter,
  BsCalendar,
  BsPeople,
  BsClock,
  BsCheckCircle,
  BsExclamationTriangle,
  BsCollection,
  BsDownload,
} from "react-icons/bs";

const ProjectPortfolioDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [timeFrame, setTimeFrame] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch projects with related data
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

        // Fetch teams
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id, name")
          .order("name");

        if (teamsError) throw teamsError;

        setProjects(projectsData || []);
        setTeams(teamsData || []);
      } catch (err) {
        setError("Failed to load data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const exportToPDF = async () => {
    setExporting(true);

    try {
      // Get the main content element to capture
      const element = document.getElementById("project-report-content");

      if (!element) {
        throw new Error("Report content not found");
      }

      // Capture the entire content as canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: false,
        scrollY: -window.scrollY,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          position,
          imgWidth,
          imgHeight
        );
        heightLeft -= pageHeight;
      }

      // Add header with timestamp and page numbers
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        // Add page number footer
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
        // Add timestamp on first page - MOVED TO TOP RIGHT
        if (i === 1) {
          pdf.setFontSize(8);
          pdf.setTextColor(150);
          // Position in top right corner (page width - margin, small top margin)
          pdf.text(
            `Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            pdf.internal.pageSize.getWidth() - 10, // Right margin
            10, // Top margin
            { align: "right" }
          );
        }
      }

      // Save the PDF
      const fileName = `Project-Portfolio-Report-${format(
        new Date(),
        "yyyy-MM-dd"
      )}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF Export Error:", error);
      setError("Failed to generate PDF: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  // Process data for visualizations
  const processedData = useMemo(() => {
    let filteredProjects = projects;

    // Apply team filter
    if (teamFilter !== "all") {
      filteredProjects = filteredProjects.filter(
        (project) => project.team_id === parseInt(teamFilter)
      );
    }
    // Apply time frame filter
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

    // Status distribution
    const statusDistribution = [
      {
        name: "Planned",
        value: filteredProjects.filter((p) => p.status === "planned").length,
        color: "#8884d8",
      },
      {
        name: "In Progress",
        value: filteredProjects.filter((p) => p.status === "in_progress")
          .length,
        color: "#0088FE",
      },
      {
        name: "On Hold",
        value: filteredProjects.filter((p) => p.status === "on_hold").length,
        color: "#FFBB28",
      },
      {
        name: "Completed",
        value: filteredProjects.filter((p) => p.status === "completed").length,
        color: "#00C49F",
      },
    ];

    // Team distribution
    const teamDistribution = teams
      .map((team) => ({
        name: team.name,
        projects: filteredProjects.filter((p) => p.team_id === team.id).length,
        completed: filteredProjects.filter(
          (p) => p.team_id === team.id && p.status === "completed"
        ).length,
      }))
      .filter((team) => team.projects > 0);

    // Timeline analysis
    const timelineData = filteredProjects
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

    // Task metrics by project
    const projectTaskMetrics = filteredProjects.map((project) => {
      const tasks = project.tasks || [];
      return {
        name: project.name,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "Completed").length,
        completionRate:
          tasks.length > 0
            ? (tasks.filter((t) => t.status === "Completed").length /
                tasks.length) *
              100
            : 0,
      };
    });

    // Overall metrics
    const totalProjects = filteredProjects.length;
    const completedProjects = filteredProjects.filter(
      (p) => p.status === "completed"
    ).length;
    const inProgressProjects = filteredProjects.filter(
      (p) => p.status === "in_progress"
    ).length;
    const overdueProjects = filteredProjects.filter((p) => {
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
      filteredProjects,
    };
  }, [projects, teams, timeFrame, teamFilter]);

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

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  return (
    <Container fluid className="py-4">
      <div id="project-report-content">
        <Row className="mb-4">
          <Col>
            <h2 className="d-flex align-items-center">
              <BsCollection className="me-2" /> Project Portfolio Dashboard
            </h2>
            <p className="text-muted">
              Overview of all projects across the organization
            </p>
          </Col>
          <Col xs="auto">
            <div className="d-flex gap-2">
              <Form.Select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value)}
                style={{ width: "150px" }}
              >
                <option value="all">All Time</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </Form.Select>
              <Form.Select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                style={{ width: "200px" }}
              >
                <option value="all">All Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
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
          {/* Project Status Distribution */}
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

          {/* Team Performance */}
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
                      <Bar
                        dataKey="completed"
                        name="Completed"
                        fill="#00C49F"
                      />
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

          {/* Project Timeline Progress */}
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
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Progress"]}
                      />
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

          {/* Task Completion Rates */}
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

        {/* Project List */}
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">
              All Projects ({processedData.filteredProjects.length})
            </h5>
          </Card.Header>
          <Card.Body>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Team</th>
                    <th>Manager</th>
                    <th>Status</th>
                    <th>Tasks</th>
                    <th>Timeline</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.filteredProjects.map((project) => {
                    const tasks = project.tasks || [];
                    const completedTasks = tasks.filter(
                      (t) => t.status === "Completed"
                    ).length;
                    const completionRate =
                      tasks.length > 0
                        ? (completedTasks / tasks.length) * 100
                        : 0;

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
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
};

export default ProjectPortfolioDashboard;
