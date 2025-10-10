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

// Define projects per page
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
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' or 'desc'

  // FIX: Helper function defined outside of useMemo to avoid 'no-undef' error.
  const getCompletionRate = (project) => {
    const tasks = project.tasks || [];
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter((t) => t.status === "Completed").length;
    // Return percentage
    return (completedTasks / tasks.length) * 100;
  };

  // Fetch data (retains original logic to fetch ALL for dashboard aggregates)
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

  // PDF Export remains the same
  const exportToPDF = async () => {
    setExporting(true);
    try {
        const element = document.getElementById("project-report-content");
        if (!element) throw new Error("Report content not found");

        const canvas = await html2canvas(element, {
            scale: 2, 
            useCORS: true,
            allowTaint: false,
            scrollY: -window.scrollY,
            width: element.scrollWidth,
            height: element.scrollHeight,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
        });

        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210; 
        const pageHeight = 297; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(
            canvas.toDataURL("image/png"),
            "PNG",
            0,
            position,
            imgWidth,
            imgHeight
        );
        heightLeft -= pageHeight;

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

        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(10);
            pdf.setTextColor(100);
            pdf.text(
                `Page ${i} of ${totalPages}`,
                pdf.internal.pageSize.getWidth() / 2,
                pdf.internal.pageSize.getHeight() - 10,
                { align: "center" }
            );
            if (i === 1) {
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text(
                    `Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
                    pdf.internal.pageSize.getWidth() - 10,
                    10,
                    { align: "right" }
                );
            }
        }

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


  // Process data for visualizations, now including filtering and sorting
  const processedData = useMemo(() => {
    let filteredProjects = projects;

    // 1. Filtering Logic
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

    // 2. Sorting Logic
    const sortedProjects = [...filteredProjects].sort((a, b) => {
        let valA, valB;

        switch (sortBy) {
            case 'name':
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
                break;
            case 'team':
                valA = a.team?.name?.toLowerCase() || "";
                valB = b.team?.name?.toLowerCase() || "";
                break;
            case 'status':
                valA = a.status.toLowerCase();
                valB = b.status.toLowerCase();
                break;
            case 'progress':
                valA = getCompletionRate(a); 
                valB = getCompletionRate(b); 
                break;
            case 'created_at':
            default:
                valA = parseISO(a.created_at).getTime();
                valB = parseISO(b.created_at).getTime();
                break;
        }

        if (valA < valB) {
            return sortOrder === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
    });


    // --- Dashboard Metrics (Calculated over the WHOLE sortedProjects) ---

    // Status distribution
    const statusDistribution = [
      {
        name: "Planned",
        value: sortedProjects.filter((p) => p.status === "planned").length,
        color: "#8884d8",
      },
      {
        name: "In Progress",
        value: sortedProjects.filter((p) => p.status === "in_progress")
          .length,
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

    // Team distribution
    const teamDistribution = teams
      .map((team) => ({
        name: team.name,
        projects: sortedProjects.filter((p) => p.team_id === team.id).length,
        completed: sortedProjects.filter(
          (p) => p.team_id === team.id && p.status === "completed"
        ).length,
      }))
      .filter((team) => team.projects > 0);

    // Timeline analysis
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

    // Task metrics by project
    const projectTaskMetrics = sortedProjects.map((project) => {
      const tasks = project.tasks || [];
      return {
        name: project.name,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "Completed").length,
        completionRate: getCompletionRate(project), // Uses the fixed helper
      };
    });

    // Overall metrics
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

  // --- PAGINATION LOGIC ---
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
  
  // Toggle sort direction if clicking the same column, otherwise set new column to 'desc'
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc'); // Default to descending for new sorts
    }
    setCurrentPage(1); // Reset page on sort change
  };

  const renderSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' 
        ? <BsSortAlphaUp className="ms-1 align-text-bottom" />
        : <BsSortAlphaDown className="ms-1 align-text-bottom" />;
  };
  
  // Render the Pagination component
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
        <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
        <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
        
        {startPage > 1 && <Pagination.Ellipsis />}

        {items}

        {endPage < totalPages && <Pagination.Ellipsis />}

        <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
        <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
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
      <div id="project-report-content">
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
          </Col>
        </Row>
        
        {/* FILTERS AND SORTING CARD */}
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
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="p-0 mt-2"
                        >
                            Order: {sortOrder === 'asc' ? 'Ascending' : 'Descending'} 
                            {sortOrder === 'asc' ? <BsSortAlphaUp className="ms-1" /> : <BsSortAlphaDown className="ms-1" />}
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
              <Card.Header><h5 className="mb-0">Project Status Distribution</h5></Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={processedData.statusDistribution} cx="50%" cy="50%" labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80} fill="#8884d8" dataKey="value"
                    >
                      {processedData.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>

          {/* Team Performance */}
          <Col md={6} className="mb-4">
            <Card className="h-100">
              <Card.Header><h5 className="mb-0">Projects by Team</h5></Card.Header>
              <Card.Body>
                {processedData.teamDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={processedData.teamDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
                      <Bar dataKey="projects" name="Total Projects" fill="#8884d8" />
                      <Bar dataKey="completed" name="Completed" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5 text-muted">No team data available</div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Project Timeline Progress */}
          <Col md={6} className="mb-4">
            <Card className="h-100">
              <Card.Header><h5 className="mb-0">Project Timeline Progress</h5></Card.Header>
              <Card.Body>
                {processedData.timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={processedData.timelineData} layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => [`${value}%`, "Progress"]}/>
                      <Bar dataKey="progress" name="Progress %">
                        {processedData.timelineData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.isBehind ? "#FF8042" : entry.progress > 75 ? "#00C49F" : entry.progress > 50 ? "#FFBB28" : "#0088FE"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5 text-muted">No timeline data available</div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Task Completion Rates */}
          <Col md={6} className="mb-4">
            <Card className="h-100">
              <Card.Header><h5 className="mb-0">Task Completion by Project</h5></Card.Header>
              <Card.Body>
                {processedData.projectTaskMetrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={processedData.projectTaskMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80}/>
                      <YAxis /><Tooltip /><Legend />
                      <Line type="monotone" dataKey="completionRate" name="Completion Rate %" stroke="#8884d8"/>
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5 text-muted">No task data available</div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>


        {/* Project List (PAGINATED & SORTABLE) */}
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">
              All Projects ({processedData.filteredProjects.length})
            </h5>
            <small className="text-muted">
                Showing **{paginatedProjects.length}** projects on page **{currentPage}** of **{totalPages}**.
            </small>
          </Card.Header>
          <Card.Body>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                        Project {renderSortIcon('name')}
                    </th>
                    <th onClick={() => handleSort('team')} style={{ cursor: 'pointer' }}>
                        Team {renderSortIcon('team')}
                    </th>
                    <th>Manager</th>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                        Status {renderSortIcon('status')}
                    </th>
                    <th>Tasks</th>
                    <th>Timeline</th>
                    <th onClick={() => handleSort('progress')} style={{ cursor: 'pointer' }}>
                        Progress {renderSortIcon('progress')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.map((project) => {
                    const tasks = project.tasks || [];
                    const completedTasks = tasks.filter(
                      (t) => t.status === "Completed"
                    ).length;
                    // Use the helper function here for clean calculation
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
      </div>
    </Container>
  );
};

export default ProjectPortfolioDashboard;