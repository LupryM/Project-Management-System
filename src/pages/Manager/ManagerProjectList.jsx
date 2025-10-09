import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Button,
  Form,
  Container,
  Row,
  Col,
  Card,
  Badge,
  ProgressBar,
  Alert,
  Spinner,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { Link } from "react-router-dom";
import { logActivity } from "../../lib/logger"; // ✅ Import logger
import {
  BsFolder,
  BsPeople,
  BsPerson,
  BsCalendar,
  BsListCheck,
  BsArrowRight,
  BsBoxArrowRight,
  BsClock,
  BsPlayCircle,
  BsPauseCircle,
  BsCheckCircle,
  BsSearch,
  BsFilter,
  BsPlusCircle,
} from "react-icons/bs";

const getStatusVariant = (status) => {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "primary";
    case "on_hold":
      return "warning";
    case "planned":
      return "secondary";
    default:
      return "secondary";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "completed":
      return <BsCheckCircle className="me-1" />;
    case "in_progress":
      return <BsPlayCircle className="me-1" />;
    case "on_hold":
      return <BsPauseCircle className="me-1" />;
    case "planned":
      return <BsClock className="me-1" />;
    default:
      return <BsClock className="me-1" />;
  }
};

const getStatusText = (status) => {
  const map = {
    planned: "Planned",
    in_progress: "In Progress",
    on_hold: "On Hold",
    completed: "Completed",
  };
  return map[status] || status;
};

const formatDate = (dateString) =>
  dateString ? new Date(dateString).toLocaleDateString() : "—";

const ManagerProjectList = () => {
  // STATE FOR PROJECTS LIST
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // MODAL STATE
  const [showModal, setShowModal] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [originalProjectData, setOriginalProjectData] = useState(null); // NEW: Store original data for comparison

  // FORM STATE
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "planned",
    team_id: "",
    manager_id: "",
    start_date: "",
    due_date: "",
  });

  // DATA STATE
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // =========================================================================
  // ENHANCED NOTIFICATION FUNCTIONALITY WITH DETAILED CHANGE TRACKING
  // =========================================================================

  // Helper function to detect what changed between old and new project data
  const detectChanges = (oldData, newData) => {
    const changes = [];

    if (oldData.name !== newData.name) {
      changes.push(`name from "${oldData.name}" to "${newData.name}"`);
    }

    if (oldData.description !== newData.description) {
      if (!oldData.description && newData.description) {
        changes.push("description added");
      } else if (oldData.description && !newData.description) {
        changes.push("description removed");
      } else {
        changes.push("description updated");
      }
    }

    if (oldData.status !== newData.status) {
      changes.push(
        `status from ${getStatusText(oldData.status)} to ${getStatusText(
          newData.status
        )}`
      );
    }

    if (oldData.team_id !== newData.team_id) {
      const oldTeam =
        teams.find((t) => t.id === oldData.team_id)?.name || "Unassigned";
      const newTeam =
        teams.find((t) => t.id === newData.team_id)?.name || "Unassigned";
      changes.push(`team from "${oldTeam}" to "${newTeam}"`);
    }

    if (oldData.start_date !== newData.start_date) {
      const oldDate = formatDate(oldData.start_date) || "Not set";
      const newDate = formatDate(newData.start_date) || "Not set";
      changes.push(`start date from ${oldDate} to ${newDate}`);
    }

    if (oldData.due_date !== newData.due_date) {
      const oldDate = formatDate(oldData.due_date) || "Not set";
      const newDate = formatDate(newData.due_date) || "Not set";
      changes.push(`due date from ${oldDate} to ${newDate}`);
    }

    return changes;
  };

  // ENHANCED NOTIFY TEAM MEMBERS FUNCTION WITH DETAILED CHANGES
  const notifyTeamMembers = async (
    projectId,
    projectName,
    type,
    teamId,
    changes = []
  ) => {
    try {
      if (!session?.user?.id || !teamId) return;

      // Get all team members for the assigned team
      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (error || !teamMembers || teamMembers.length === 0) return;

      // Build detailed message based on changes
      let detailedMessage;
      if (type === "project_created") {
        detailedMessage = `New project "${projectName}" was created`;
        // Add creation details
        const details = [];
        if (formData.description)
          details.push(`Description: ${formData.description}`);
        if (formData.start_date)
          details.push(`Start: ${formatDate(formData.start_date)}`);
        if (formData.due_date)
          details.push(`Due: ${formatDate(formData.due_date)}`);
        if (details.length > 0) {
          detailedMessage += ` with details: ${details.join(", ")}`;
        }
      } else {
        // project_updated - include specific changes
        if (changes.length > 0) {
          detailedMessage = `Project "${projectName}" was updated: ${changes.join(
            ", "
          )}`;
        } else {
          detailedMessage = `Project "${projectName}" was updated with minor changes`;
        }
      }

      // Create notification objects for each team member
      const notifications = teamMembers.map((member) => ({
        type: type,
        user_id: member.user_id,
        actor_id: session.user.id,
        project_id: projectId,
        message: detailedMessage,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      // Insert all notifications in one batch
      const { error: notifyError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifyError) {
        console.error("Failed to create notifications:", notifyError);
      }
    } catch (err) {
      console.error("Error in notifyTeamMembers:", err);
    }
  };

  // Check for active session on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          setSession(session);
          if (session) {
            await fetchUsers();
            await fetchTeams();
            await fetchProjects();
          }
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error("Auth initialization error:", error.message);
        setError("Auth initialization error");
      }
    };

    initializeAuth();
  }, []);

  // Fetch data when session changes
  useEffect(() => {
    if (session) {
      fetchProjects();
    } else {
      setLoading(false);
    }
  }, [session]);

  // Filter projects based on search term and status filter
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        searchTerm === "" ||
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.teams?.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  // FETCH PROJECTS FROM SUPABASE - ONLY MANAGER'S PROJECTS
  const fetchProjects = async () => {
    try {
      setLoading(true);
      if (!session?.user?.id) return;

      let query = supabase
        .from("projects")
        .select(
          `
          *,
          teams (name),
          manager:profiles!projects_manager_id_fkey (first_name, last_name),
          tasks (id, status)
        `
        )
        .eq("manager_id", session.user.id);

      const { data, error } = await query.order("due_date", {
        ascending: true,
      });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error.message);
      setError("Error loading projects: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // FETCH USERS FROM SUPABASE
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error.message);
    }
  };

  // FETCH TEAMS FROM SUPABASE
  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, description")
        .order("name", { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error("Error fetching teams:", error.message);
    }
  };

  // Calculate task progress for a project - EXCLUDES CANCELLED TASKS
  const calculateProgress = (project) => {
    if (!project.tasks || project.tasks.length === 0) return 0;

    const activeTasks = project.tasks.filter((t) => t.status !== "cancelled");
    if (activeTasks.length === 0) return 0;

    const completedTasks = activeTasks.filter(
      (t) => t.status === "Completed"
    ).length;

    return Math.round((completedTasks / activeTasks.length) * 100);
  };

  const getDisplayStatus = (project) => {
    return project.status;
  };

  const canMarkAsCompleted = (project) => {
    const progress = calculateProgress(project);
    return (
      progress === 100 &&
      project.tasks &&
      project.tasks.some((t) => t.status !== "cancelled") &&
      project.status !== "completed"
    );
  };

  // ENHANCED HANDLE MODAL OPEN - STORE ORIGINAL DATA FOR COMPARISON
  const handleShowModal = (project = null) => {
    setCurrentProject(project);
    const newFormData = {
      name: project?.name || "",
      description: project?.description || "",
      status: project?.status || "planned",
      team_id: project?.team_id || "",
      manager_id: project?.manager_id || session?.user?.id || "",
      start_date: project?.start_date?.split("T")[0] || "",
      due_date: project?.due_date?.split("T")[0] || "",
    };
    setFormData(newFormData);

    // NEW: Store original project data for change detection
    if (project) {
      setOriginalProjectData({
        name: project.name,
        description: project.description,
        status: project.status,
        team_id: project.team_id,
        start_date: project.start_date,
        due_date: project.due_date,
      });
    } else {
      setOriginalProjectData(null);
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentProject(null);
    setOriginalProjectData(null); // NEW: Clear original data
  };

  // ENHANCED HANDLE SUBMIT WITH DETAILED CHANGE TRACKING AND LOGGING
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentProject?.status === "completed") {
      setError("Cannot modify a completed project");
      return;
    }

    try {
      if (currentProject) {
        // UPDATE EXISTING PROJECT - WITH CHANGE DETECTION
        const { data: updatedProject, error } = await supabase
          .from("projects")
          .update({
            name: formData.name,
            description: formData.description,
            status: formData.status,
            team_id: formData.team_id,
            manager_id: formData.manager_id,
            start_date: formData.start_date,
            due_date: formData.due_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentProject.id)
          .eq("manager_id", session.user.id)
          .select()
          .single();

        if (error) throw error;

        // ✅ Log project update activity
        await logActivity({
          type: "project_updated",
          details: `Updated project: "${formData.name}" (ID: ${currentProject.id})`,
          projectId: currentProject.id,
          userId: session.user.id,
        });

        // NEW: Detect what changed and send detailed notifications
        const changes = detectChanges(originalProjectData, formData);

        // ✅ Log detailed changes
        if (changes.length > 0) {
          await logActivity({
            type: "project_details_changed",
            details: `Project "${formData.name}" changes: ${changes.join(
              ", "
            )}`,
            projectId: currentProject.id,
            userId: session.user.id,
          });
        }

        await notifyTeamMembers(
          currentProject.id,
          formData.name,
          "project_updated",
          formData.team_id,
          changes
        );
      } else {
        // CREATE NEW PROJECT - WITH DETAILED CREATION INFO
        const { data, error } = await supabase
          .from("projects")
          .insert({
            name: formData.name,
            description: formData.description,
            status: formData.status,
            team_id: formData.team_id,
            manager_id: session.user.id,
            start_date: formData.start_date,
            due_date: formData.due_date,
            created_by: session.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // ✅ Log project creation activity
        await logActivity({
          type: "project_created",
          details: `Created new project: "${formData.name}" with team "${
            teams.find((t) => t.id === formData.team_id)?.name || "Unknown"
          }"`,
          projectId: data.id,
          userId: session.user.id,
        });

        await notifyTeamMembers(
          data.id,
          formData.name,
          "project_created",
          formData.team_id
        );
      }

      fetchProjects();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving project:", error.message);

      // ✅ Log project save failure
      await logActivity({
        type: "project_save_failed",
        details: `Failed to ${currentProject ? "update" : "create"} project "${
          formData.name
        }": ${error.message}`,
        projectId: currentProject?.id || null,
        userId: session.user.id,
      });

      setError("Error saving project: " + error.message);
    }
  };

  // Function to mark project as completed with logging
  const markProjectAsCompleted = async (project) => {
    if (!canMarkAsCompleted(project)) return;

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .eq("manager_id", session.user.id);

      if (error) throw error;

      // ✅ Log project completion
      await logActivity({
        type: "project_completed",
        details: `Marked project "${project.name}" as completed - all tasks finished`,
        projectId: project.id,
        userId: session.user.id,
      });

      // Refresh projects list
      fetchProjects();
    } catch (error) {
      console.error("Error marking project as completed:", error.message);

      // ✅ Log completion failure
      await logActivity({
        type: "project_completion_failed",
        details: `Failed to mark project "${project.name}" as completed: ${error.message}`,
        projectId: project.id,
        userId: session.user.id,
      });

      setError("Error marking project as completed: " + error.message);
    }
  };

  // Function to delete project with logging
  const handleDeleteProject = async (project) => {
    if (
      !window.confirm(
        `Are you sure you want to delete project "${project.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)
        .eq("manager_id", session.user.id);

      if (error) throw error;

      // ✅ Log project deletion
      await logActivity({
        type: "project_deleted",
        details: `Deleted project: "${project.name}" (ID: ${project.id})`,
        userId: session.user.id,
      });
      // Refresh projects list
      fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error.message);

      // ✅ Log deletion failure
      await logActivity({
        type: "project_deletion_failed",
        details: `Failed to delete project "${project.name}": ${error.message}`,
        projectId: project.id,
        userId: session.user.id,
      });

      setError("Error deleting project: " + error.message);
    }
  };

  if (!session) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Card style={{ width: "400px" }} className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="text-center mb-4">Sign In Required</h2>
            <p className="text-center text-muted">
              Please sign in to view your projects.
            </p>
            <Button
              variant="primary"
              onClick={() =>
                supabase.auth.signInWithPassword({
                  email: "demo@example.com",
                  password: "demo123",
                })
              }
              className="w-100"
            >
              Sign In (Demo)
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container
        fluid
        className="d-flex justify-content-center align-items-center min-vh-50"
      >
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading your projects...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-1">
            <BsFolder className="me-2" /> My Projects
          </h2>
          <p className="text-muted mb-0">
            Projects you manage - {session.user.email}
          </p>
        </Col>
        <Col className="text-end"></Col>
      </Row>

      {error && (
        <Alert
          variant="danger"
          onClose={() => setError(null)}
          dismissible
          className="mb-4"
        >
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="py-3">
          <Row className="g-3">
            <Col md={6}>
              <div className="position-relative">
                <BsSearch className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="form-control ps-5"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </Col>
            <Col md={6}>
              <div className="position-relative">
                <BsFilter className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                <select
                  className="form-select ps-5"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row className="mb-3">
        <Col className="text-end">
          <Button
            onClick={() => handleShowModal()}
            className="d-flex align-items-center ms-auto"
          >
            <BsPlusCircle className="me-1" /> New Project
          </Button>
        </Col>
      </Row>

      {filteredProjects.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <BsFolder size={48} className="text-muted mb-3" />
            <h5 className="text-muted">
              {projects.length === 0
                ? "No projects assigned to you yet"
                : "No projects match your filters"}
            </h5>
            <p className="text-muted">
              {projects.length === 0
                ? "Projects assigned to you will appear here"
                : "Try changing your search or filter criteria"}
            </p>
            {projects.length === 0 && (
              <Button variant="primary" onClick={() => handleShowModal()}>
                Create Your First Project
              </Button>
            )}
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {filteredProjects.map((project) => {
            const progress = calculateProgress(project);
            const taskCount = project.tasks ? project.tasks.length : 0;
            const completedTasks = project.tasks
              ? project.tasks.filter((t) => t.status === "Completed").length
              : 0;
            const cancelledTasks = project.tasks
              ? project.tasks.filter((t) => t.status === "cancelled").length
              : 0;
            const activeTasksCount = taskCount - cancelledTasks;
            const displayStatus = getDisplayStatus(project);
            const readyForCompletion = canMarkAsCompleted(project);

            return (
              <Col key={project.id} md={6} lg={4} className="mb-4">
                <Card className="h-100 project-card border-0 shadow-sm">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h5 className="card-title mb-0">{project.name}</h5>
                      <Badge
                        bg={getStatusVariant(displayStatus)}
                        className="d-flex align-items-center"
                      >
                        {getStatusIcon(displayStatus)}
                        {getStatusText(displayStatus)}
                      </Badge>
                    </div>

                    <p className="text-muted flex-grow-1">
                      {project.description || "No description available"}
                    </p>

                    <div className="mb-3">
                      <div className="d-flex align-items-center text-muted mb-2">
                        <BsPeople className="me-2" />
                        <span>Team: {project.teams?.name || "Unassigned"}</span>
                      </div>

                      <div className="d-flex align-items-center text-muted mb-2">
                        <BsPerson className="me-2" />
                        <span>
                          Manager:{" "}
                          {project.manager
                            ? `${project.manager.first_name} ${project.manager.last_name}`
                            : "You"}
                        </span>
                      </div>

                      <div className="d-flex align-items-center text-muted mb-2">
                        <BsCalendar className="me-2" />
                        <span>Due: {formatDate(project.due_date)}</span>
                      </div>

                      <div className="d-flex align-items-center text-muted mb-2">
                        <BsListCheck className="me-2" />
                        <span>
                          {taskCount} total tasks ({completedTasks} completed)
                          {cancelledTasks > 0 && (
                            <small className="text-muted ms-1">
                              ({cancelledTasks} cancelled)
                            </small>
                          )}
                        </span>
                      </div>
                    </div>

                    {taskCount > 0 && (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="text-muted">Progress</small>
                          <small className="text-muted">
                            {completedTasks}/{activeTasksCount} active tasks (
                            {progress}%)
                          </small>
                        </div>
                        <ProgressBar
                          now={progress}
                          variant={getStatusVariant(displayStatus)}
                          className="mb-3"
                          style={{ height: "8px" }}
                        />
                        {readyForCompletion && (
                          <div className="d-flex align-items-center">
                            <small className="text-success me-2">
                              ✓ All active tasks completed - ready to mark as
                              Completed
                            </small>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => markProjectAsCompleted(project)}
                            >
                              Mark Complete
                            </Button>
                          </div>
                        )}
                        {project.status === "completed" && (
                          <small className="text-info">
                            ✓ Project completed - status is locked
                          </small>
                        )}
                      </div>
                    )}

                    <div className="d-flex gap-2 mt-auto">
                      <Button
                        as={Link}
                        to={`/project/${project.id}`}
                        variant="outline-primary"
                        size="sm"
                        className="flex-fill"
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleShowModal(project)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteProject(project)}
                        disabled={project.status === "completed"}
                      >
                        Delete
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* MODAL */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {currentProject ? "Edit Project" : "Create New Project"}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Project Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter project name"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter project description"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    disabled={currentProject?.status === "completed"}
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option
                      value="completed"
                      disabled={
                        currentProject?.status === "completed" ||
                        (currentProject &&
                          currentProject.tasks &&
                          currentProject.tasks.length > 0 &&
                          currentProject.tasks.filter(
                            (t) => t.status === "Completed"
                          ).length <
                            currentProject.tasks.filter(
                              (t) => t.status !== "cancelled"
                            ).length)
                      }
                    >
                      Completed
                      {currentProject &&
                        currentProject.tasks &&
                        currentProject.tasks.length > 0 &&
                        ` (${
                          currentProject.tasks.filter(
                            (t) => t.status === "Completed"
                          ).length
                        }/${
                          currentProject.tasks.filter(
                            (t) => t.status !== "cancelled"
                          ).length
                        } active tasks)`}
                    </option>
                  </Form.Select>
                  {currentProject?.status === "completed" && (
                    <Form.Text className="text-info">
                      ✓ Project is completed and cannot be reverted
                    </Form.Text>
                  )}
                  {formData.status === "completed" &&
                    currentProject?.status !== "completed" &&
                    currentProject?.tasks &&
                    currentProject.tasks.filter((t) => t.status === "Completed")
                      .length <
                      currentProject.tasks.filter(
                        (t) => t.status !== "cancelled"
                      ).length && (
                      <Form.Text className="text-warning">
                        Cannot mark as Completed until all active tasks are
                        finished
                      </Form.Text>
                    )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Team *</Form.Label>
                  <Form.Select
                    value={formData.team_id}
                    onChange={(e) =>
                      setFormData({ ...formData, team_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Due Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Manager</Form.Label>
              <Form.Select value={formData.manager_id} disabled={true}>
                <option value={session?.user?.id}>
                  You ({session?.user?.email})
                </option>
              </Form.Select>
              <Form.Text className="text-muted">
                You are automatically assigned as the project manager
              </Form.Text>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {currentProject ? "Update Project" : "Create Project"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ManagerProjectList;
