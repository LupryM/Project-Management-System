import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Form,
  Modal,
  Alert,
  Spinner,
  ProgressBar,
  ListGroup,
  Dropdown,
  Tab,
  Tabs,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BsSearch,
  BsFilter,
  BsArrowRepeat,
  BsThreeDotsVertical,
  BsCalendar,
  BsPerson,
  BsFolder,
  BsCheckCircle,
  BsClockHistory,
  BsCircle,
  BsPencil,
  BsChat,
  BsExclamationCircle,
  BsExclamationTriangle,
  BsExclamationDiamond,
  BsExclamationOctagon,
  BsPauseCircle,
  BsXCircle,
  BsEye,
  BsClipboardCheck,
  BsGraphUp,
  BsListCheck,
  BsPersonBadge,
  BsArchive,
  BsPeople,
  BsArrowLeft,
  BsFunnel,
} from "react-icons/bs";

// Comments component (keep as is)
const TaskComments = ({ taskId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_comments")
      .select(
        `
        comment_id,
        comment_text,
        created_at,
        profiles:user_id (first_name, last_name)
      `
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      setError("Failed to load comments");
    } else {
      setComments(data);
    }
    setLoading(false);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const { error } = await supabase.from("task_comments").insert([
      {
        task_id: taskId,
        user_id: currentUser.id,
        comment_text: newComment.trim(),
      },
    ]);

    if (error) {
      setError("Failed to add comment");
    } else {
      setNewComment("");
      fetchComments();
    }
  };

  useEffect(() => {
    if (taskId && currentUser) {
      fetchComments();

      const subscription = supabase
        .channel(`comments-task-${taskId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "task_comments",
            filter: `task_id=eq.${taskId}`,
          },
          (payload) => {
            setComments((prev) => [...prev, payload.new]);
          }
        )
        .subscribe();

      return () => supabase.removeChannel(subscription);
    }
  }, [taskId, currentUser]);

  if (loading) return <Spinner animation="border" size="sm" />;

  return (
    <div className="mt-3">
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="d-flex align-items-center mb-2">
        <BsChat className="me-1 text-muted" />
        <h6 className="mb-0 small text-muted">Comments</h6>
      </div>

      <ListGroup className="mb-2">
        {comments.length === 0 && (
          <ListGroup.Item className="text-muted text-center py-3 small">
            No comments yet
          </ListGroup.Item>
        )}
        {comments.map((c) => (
          <ListGroup.Item key={c.comment_id} className="py-2 px-3 small">
            <div className="d-flex justify-content-between align-items-start">
              <strong className="text-primary">
                {c.profiles?.first_name || "User"}
              </strong>
              <small className="text-muted">
                {new Date(c.created_at).toLocaleString()}
              </small>
            </div>
            <div className="mt-1">{c.comment_text}</div>
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Form onSubmit={handleAddComment}>
        <Form.Group className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            size="sm"
          />
          <Button type="submit" size="sm" variant="outline-primary">
            Add
          </Button>
        </Form.Group>
      </Form>
    </div>
  );
};

// Enhanced TaskCard component with team-specific reassignment
const TaskCard = ({
  task,
  getAssignedUsers,
  currentUser,
  onCancelTask,
  onReassignTask,
  showReassignButton = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const getPriorityVariant = (priority) => {
    const map = {
      1: "danger",
      2: "warning",
      3: "info",
      4: "secondary",
      5: "light",
    };
    return map[priority] || "secondary";
  };

  const getPriorityText = (priority) => {
    const map = {
      1: "Critical",
      2: "High",
      3: "Medium",
      4: "Low",
      5: "Lowest",
    };
    return map[priority] || `Priority ${priority}`;
  };

  const getPriorityIcon = (priority) => {
    const map = {
      1: <BsExclamationOctagon className="me-1" />,
      2: <BsExclamationDiamond className="me-1" />,
      3: <BsExclamationTriangle className="me-1" />,
      4: <BsExclamationCircle className="me-1" />,
      5: <BsExclamationCircle className="me-1" />,
    };
    return map[priority] || <BsExclamationCircle className="me-1" />;
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "Completed":
        return "success";
      case "in_progress":
        return "primary";
      case "on_hold":
        return "warning";
      case "cancelled":
        return "secondary";
      case "todo":
        return "outline-secondary";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
        return <BsCheckCircle className="me-1" />;
      case "in_progress":
        return <BsClockHistory className="me-1" />;
      case "on_hold":
        return <BsPauseCircle className="me-1" />;
      case "cancelled":
        return <BsXCircle className="me-1" />;
      case "todo":
        return <BsCircle className="me-1" />;
      default:
        return <BsCircle className="me-1" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && task.status !== "Completed";
  };

  const handleCancelTask = () => {
    onCancelTask(task.id, task.title, task.project_id);
  };

  const fetchAvailableTeamUsers = async () => {
    try {
      setReassigning(true);

      // Get team members for this task's project
      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select(
          `
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email,
            status
          )
        `
        )
        .eq("team_id", task.project_id) // Using project_id as team_id (adjust if your schema is different)
        .eq("profiles.status", "Active");

      if (error) throw error;

      const activeTeamUsers = (teamMembers || [])
        .filter(
          (member) => member.profiles && member.profiles.status === "Active"
        )
        .map((member) => member.profiles);

      setAvailableUsers(activeTeamUsers || []);
    } catch (error) {
      console.error("Error fetching team users:", error);
    } finally {
      setReassigning(false);
    }
  };

  const handleReassignTask = async () => {
    if (!selectedUserId) return;

    try {
      setReassigning(true);

      // Remove existing assignments
      const { error: deleteError } = await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", task.id);

      if (deleteError) throw deleteError;

      // Add new assignment
      const { error: insertError } = await supabase
        .from("task_assignments")
        .insert({
          task_id: task.id,
          user_id: selectedUserId,
          assigned_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Call the parent handler to refresh tasks
      if (onReassignTask) {
        onReassignTask(task.id, selectedUserId);
      }

      setShowDetails(false);
      setSelectedUserId("");
    } catch (error) {
      console.error("Error reassigning task:", error);
    } finally {
      setReassigning(false);
    }
  };

  const openReassignModal = () => {
    setShowDetails(true);
    fetchAvailableTeamUsers();
  };

  return (
    <>
      <Card className="mb-3 shadow-sm task-card border-0">
        <Card.Body className="p-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="mb-0 task-title fw-bold">{task.title}</h6>
            {showReassignButton && (
              <Badge bg="warning" text="dark">
                Unassigned
              </Badge>
            )}
          </div>

          {task.description && (
            <div className="small text-muted task-desc mb-2">
              {task.description.length > 80
                ? `${task.description.substring(0, 80)}...`
                : task.description}
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mb-2">
            <Badge
              bg={getStatusVariant(task.status)}
              className="d-flex align-items-center fw-normal"
            >
              {getStatusIcon(task.status)}
              {task.status.replace("_", " ")}
            </Badge>

            <div
              className={`due-date small ${
                isOverdue(task.due_date) ? "text-danger fw-bold" : "text-muted"
              }`}
            >
              <BsCalendar className="me-1" />
              {formatDate(task.due_date)}
            </div>
          </div>

          <div className="d-flex justify-content-between">
            <small className="text-muted">
              <BsPerson className="me-1" />
              {getAssignedUsers(task)}
            </small>

            {task.project && (
              <small className="text-primary">
                <BsFolder className="me-1" />
                {task.project.name}
              </small>
            )}
          </div>

          <div className="mt-2">
            <Badge
              bg={getPriorityVariant(task.priority)}
              className="d-flex align-items-center fw-normal"
            >
              {getPriorityIcon(task.priority)}
              {getPriorityText(task.priority)}
            </Badge>
          </div>

          <div className="mt-3 d-flex gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              className="flex-grow-1"
              onClick={() => setShowDetails(true)}
            >
              <BsEye className="me-1" /> View Details
            </Button>

            {showReassignButton && (
              <Button variant="warning" size="sm" onClick={openReassignModal}>
                <BsPeople className="me-1" /> Reassign
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      <Modal
        show={showDetails}
        onHide={() => setShowDetails(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>{task.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={8}>
              <h6>Description</h6>
              <p className="border-start border-3 ps-3 py-2 bg-light rounded">
                {task.description || "No description provided"}
              </p>

              {/* Comments Section */}
              {currentUser && (
                <TaskComments taskId={task.id} currentUser={currentUser} />
              )}
            </Col>
            <Col md={4}>
              <h6>Details</h6>
              <Card className="border-0 bg-light">
                <Card.Body>
                  <div className="mb-2">
                    <strong>Status:</strong>{" "}
                    <Badge bg={getStatusVariant(task.status)} className="ms-1">
                      {getStatusIcon(task.status)}
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="mb-2">
                    <strong>Priority:</strong>{" "}
                    <Badge
                      bg={getPriorityVariant(task.priority)}
                      className="ms-1"
                    >
                      {getPriorityIcon(task.priority)}
                      {getPriorityText(task.priority)}
                    </Badge>
                  </div>
                  <div className="mb-2">
                    <strong>Due Date:</strong> {formatDate(task.due_date)}
                    {isOverdue(task.due_date) && (
                      <Badge bg="danger" className="ms-2">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="mb-2">
                    <strong>Assigned to:</strong> {getAssignedUsers(task)}
                    {showReassignButton && (
                      <Badge bg="warning" text="dark" className="ms-2">
                        Needs Reassignment
                      </Badge>
                    )}
                  </div>
                  {task.project && (
                    <div className="mb-2">
                      <strong>Project:</strong> {task.project.name}
                    </div>
                  )}
                  <div className="mb-2">
                    <strong>Created:</strong>{" "}
                    {task.created_at
                      ? new Date(task.created_at).toLocaleDateString()
                      : "Unknown"}
                  </div>

                  {/* Reassignment Section */}
                  {showReassignButton && (
                    <div className="mt-3 p-3 border rounded">
                      <h6>Reassign Task to Team Member</h6>
                      <Form.Group className="mb-2">
                        <Form.Label className="small">
                          Select Team Member
                        </Form.Label>
                        <Form.Select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          size="sm"
                          disabled={reassigning || availableUsers.length === 0}
                        >
                          <option value="">Choose a team member...</option>
                          {availableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} ({user.email})
                            </option>
                          ))}
                        </Form.Select>
                        {availableUsers.length === 0 && (
                          <Form.Text className="text-warning">
                            No active team members available for this project
                          </Form.Text>
                        )}
                      </Form.Group>
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={handleReassignTask}
                        disabled={
                          !selectedUserId ||
                          reassigning ||
                          availableUsers.length === 0
                        }
                        className="w-100"
                      >
                        {reassigning ? "Reassigning..." : "Reassign Task"}
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>

          {task.status !== "cancelled" && (
            <Button variant="outline-danger" onClick={handleCancelTask}>
              <BsXCircle className="me-1" />
              Cancel Task
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

// Main ManagerTasks component
const ManagerTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("active");

  // Enhanced Filters
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all"); // NEW: Assignment status filter
  const [searchTerm, setSearchTerm] = useState("");

  // URL parameter handling
  const location = useLocation();
  const navigate = useNavigate();
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      await fetchCurrentUser();
    };
    initializeData();
  }, []);

  // Check URL parameters on component mount and when location changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const filter = searchParams.get("filter");

    if (filter === "unassigned") {
      setShowUnassignedOnly(true);
      setAssignmentFilter("unassigned"); // Auto-set assignment filter
      setActiveTab("active");
    } else {
      setShowUnassignedOnly(false);
    }
  }, [location.search]);

  useEffect(() => {
    if (currentUser) {
      fetchProjects();
      fetchTasks();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      setCurrentUser(user);
    } catch (err) {
      console.error("Error fetching current user:", err.message);
      setError("Error loading user: " + err.message);
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      // Get projects where current user is manager
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("manager_id", currentUser.id);

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error("Error fetching projects:", err.message);
      setError("Error loading projects: " + err.message);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get project IDs where current user is manager
      const { data: managedProjects, error: projectsError } = await supabase
        .from("projects")
        .select("id")
        .eq("manager_id", currentUser.id);

      if (projectsError) throw projectsError;

      // If user has no managed projects, set empty tasks and return
      if (!managedProjects || managedProjects.length === 0) {
        setTasks([]);
        setFilteredTasks([]);
        setLoading(false);
        return;
      }

      const projectIds = managedProjects.map((p) => p.id);

      // Fetch tasks from the user's managed projects
      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          *,
          assignments:task_assignments(
            user:profiles(id, first_name, last_name)
          ),
          project:projects(id, name)
        `
        )
        .in("project_id", projectIds)
        .order("due_date", { ascending: true });

      if (error) throw error;

      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err.message);
      setError("Error loading tasks: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel task function
  const cancelTask = async (taskId, taskTitle, projectId) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "cancelled" })
        .eq("id", taskId);

      if (error) throw error;

      setSuccessMessage(`Task "${taskTitle}" has been cancelled successfully.`);

      // Refresh tasks
      fetchTasks();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("Error cancelling task:", err.message);
      setError("Error cancelling task: " + err.message);
    }
  };

  // Reassign task function
  const handleTaskReassigned = (taskId, newUserId) => {
    setSuccessMessage("Task reassigned successfully!");
    fetchTasks(); // Refresh tasks to show updated assignments

    // Clear success message after 5 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  // Function to clear unassigned filter
  const clearUnassignedFilter = () => {
    setShowUnassignedOnly(false);
    setAssignmentFilter("all");
    navigate("/manager-tasks"); // Remove URL parameter
  };

  // Helper function to check if a task is unassigned
  const isTaskUnassigned = (task) => {
    return !task.assignments || task.assignments.length === 0;
  };

  // Enhanced filtering logic
  useEffect(() => {
    let filtered = tasks;

    // Apply unassigned filter if active
    if (showUnassignedOnly && activeTab === "active") {
      filtered = filtered.filter(
        (task) => isTaskUnassigned(task) && task.status !== "cancelled"
      );
    } else if (assignmentFilter === "unassigned" && activeTab === "active") {
      filtered = filtered.filter(
        (task) => isTaskUnassigned(task) && task.status !== "cancelled"
      );
    } else if (assignmentFilter === "assigned" && activeTab === "active") {
      filtered = filtered.filter(
        (task) => !isTaskUnassigned(task) && task.status !== "cancelled"
      );
    }

    if (selectedProject !== "all")
      filtered = filtered.filter((t) => t.project_id == selectedProject);
    if (selectedPriority !== "all") {
      filtered = filtered.filter((t) => t.priority == selectedPriority);
    }
    if (selectedStatus !== "all")
      filtered = filtered.filter((t) => t.status === selectedStatus);
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.description &&
            t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredTasks(filtered);
  }, [
    tasks,
    selectedProject,
    selectedPriority,
    selectedStatus,
    searchTerm,
    showUnassignedOnly,
    activeTab,
    assignmentFilter,
  ]);

  const clearFilters = () => {
    setSelectedProject("all");
    setSelectedPriority("all");
    setSelectedStatus("all");
    setAssignmentFilter("all");
    setSearchTerm("");
    if (showUnassignedOnly) {
      clearUnassignedFilter();
    }
  };

  // Helper function to get assigned users
  const getAssignedUsers = (task) => {
    if (!task.assignments || task.assignments.length === 0) return "Unassigned";

    return (
      task.assignments
        .filter((assignment) => assignment.user !== null)
        .map((assignment) =>
          `${assignment.user.first_name || ""} ${
            assignment.user.last_name || ""
          }`.trim()
        )
        .filter((name) => name) // Remove empty strings
        .join(", ") || "Unassigned"
    );
  };

  // Calculate stats for dashboard
  const activeTaskStats = {
    total: tasks.filter((t) => t.status !== "cancelled").length,
    completed: tasks.filter((t) => t.status === "Completed").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    todo: tasks.filter((t) => t.status === "todo").length,
    onHold: tasks.filter((t) => t.status === "on_hold").length,
    critical: tasks.filter((t) => t.priority === 1).length,
    high: tasks.filter((t) => t.priority === 2).length,
    unassigned: tasks.filter(
      (task) => isTaskUnassigned(task) && task.status !== "cancelled"
    ).length,
    assigned: tasks.filter(
      (task) => !isTaskUnassigned(task) && task.status !== "cancelled"
    ).length,
  };

  const groupTasksByPriority = () => {
    const groups = {
      "Critical & High": filteredTasks.filter((t) => t.priority <= 2),
      Medium: filteredTasks.filter((t) => t.priority === 3),
      Low: filteredTasks.filter((t) => t.priority >= 4),
    };
    return groups;
  };

  const taskGroups = groupTasksByPriority();

  if (loading)
    return (
      <Container
        fluid
        className="p-4 text-center my-5 bg-light"
        style={{ minHeight: "100vh" }}
      >
        <Spinner animation="border" role="status" className="mb-3" />
        <h4 className="mt-3">Loading tasks...</h4>
      </Container>
    );

  return (
    <Container fluid className="p-4 bg-light" style={{ minHeight: "100vh" }}>
      {/* Header with Stats */}
      <Row className="mb-4 align-items-center">
        <Col>
          <div className="d-flex align-items-center">
            <div>
              <h2 className="fw-bold mb-0">
                <BsPersonBadge className="me-2" />
                {showUnassignedOnly
                  ? "Tasks Needing Reassignment"
                  : "Manager Dashboard"}
              </h2>
              <p className="text-muted mb-0">
                {showUnassignedOnly
                  ? "Assign these tasks to team members"
                  : "Monitor and manage your project tasks"}
              </p>
            </div>
          </div>
        </Col>
        <Col xs="auto">
          <Button
            variant="outline-primary"
            onClick={fetchTasks}
            className="d-flex align-items-center"
          >
            <BsArrowRepeat className="me-2" />
            Refresh
          </Button>
        </Col>
      </Row>

      {/* Enhanced Stats Overview */}
      <Row className="mb-4">
        <Col md={2} className="mb-3">
          <Card className="text-center border-0 shadow-sm h-100">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-primary">{activeTaskStats.total}</h4>
              <small className="text-muted">Total Tasks</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} className="mb-3">
          <Card className="text-center border-0 shadow-sm h-100">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-success">{activeTaskStats.completed}</h4>
              <small className="text-muted">Completed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} className="mb-3">
          <Card className="text-center border-0 shadow-sm h-100">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-primary">
                {activeTaskStats.inProgress}
              </h4>
              <small className="text-muted">In Progress</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} className="mb-3">
          <Card className="text-center border-0 shadow-sm h-100">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-info">{activeTaskStats.assigned}</h4>
              <small className="text-muted">Assigned</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} className="mb-3">
          <Card className="text-center border-0 shadow-sm h-100">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-warning">
                {activeTaskStats.unassigned}
              </h4>
              <small className="text-muted">Need Reassignment</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} className="mb-3">
          <Card className="text-center border-0 shadow-sm h-100">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-danger">
                {activeTaskStats.critical + activeTaskStats.high}
              </h4>
              <small className="text-muted">Critical/High</small>
            </Card.Body>
          </Card>
        </Col>
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

      {successMessage && (
        <Alert
          variant="success"
          onClose={() => setSuccessMessage(null)}
          dismissible
          className="mb-4"
        >
          {successMessage}
        </Alert>
      )}

      {/* Enhanced Tabs with Better Filtering */}
      {!showUnassignedOnly ? (
        <Card className="mb-4 shadow-sm border-0">
          <Card.Body className="p-0">
            <Tabs
              activeKey={activeTab}
              onSelect={(tab) => setActiveTab(tab)}
              className="px-3 pt-3"
            >
              <Tab
                eventKey="active"
                title={
                  <span>
                    <BsClipboardCheck className="me-1" />
                    Active Tasks (
                    {
                      filteredTasks.filter((t) => t.status !== "cancelled")
                        .length
                    }
                    )
                  </span>
                }
              >
                {/* Enhanced Filters */}
                <div className="p-3 border-bottom">
                  <Row className="g-3">
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label className="fw-medium">Project</Form.Label>
                        <div className="position-relative">
                          <BsFolder className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                          <Form.Select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="ps-5"
                          >
                            <option value="all">All Projects</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label className="fw-medium">Priority</Form.Label>
                        <div className="position-relative">
                          <BsExclamationCircle className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                          <Form.Select
                            value={selectedPriority}
                            onChange={(e) =>
                              setSelectedPriority(e.target.value)
                            }
                            className="ps-5"
                          >
                            <option value="all">All Priorities</option>
                            <option value="1">Critical</option>
                            <option value="2">High</option>
                            <option value="3">Medium</option>
                            <option value="4">Low</option>
                          </Form.Select>
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label className="fw-medium">Status</Form.Label>
                        <div className="position-relative">
                          <BsFilter className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                          <Form.Select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="ps-5"
                          >
                            <option value="all">All Statuses</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="on_hold">On Hold</option>
                            <option value="completed">Completed</option>
                          </Form.Select>
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label className="fw-medium">
                          Assignment
                        </Form.Label>
                        <div className="position-relative">
                          <BsPeople className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                          <Form.Select
                            value={assignmentFilter}
                            onChange={(e) =>
                              setAssignmentFilter(e.target.value)
                            }
                            className="ps-5"
                          >
                            <option value="all">All Tasks</option>
                            <option value="assigned">Assigned</option>
                            <option value="unassigned">
                              Need Reassignment
                            </option>
                          </Form.Select>
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label className="fw-medium">
                          Search Tasks
                        </Form.Label>
                        <div className="position-relative">
                          <BsSearch className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                          <Form.Control
                            type="text"
                            placeholder="Search by title or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ps-5"
                          />
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={1} className="d-flex align-items-end">
                      <Button
                        variant="outline-secondary"
                        onClick={clearFilters}
                        className="w-100"
                        title="Clear all filters"
                      >
                        <BsFunnel />
                      </Button>
                    </Col>
                  </Row>
                </div>

                {/* Progress Bar */}
                {activeTaskStats.total > 0 && (
                  <Card className="m-3 border-0 bg-light">
                    <Card.Body>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="fw-medium">Overall Progress</span>
                        <span className="fw-medium">
                          {Math.round(
                            (activeTaskStats.completed /
                              activeTaskStats.total) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <ProgressBar
                        now={
                          (activeTaskStats.completed / activeTaskStats.total) *
                          100
                        }
                        variant="success"
                        className="rounded-pill"
                        style={{ height: "10px" }}
                      />
                      <div className="d-flex justify-content-between mt-2">
                        <small className="text-muted">
                          {activeTaskStats.unassigned} tasks need reassignment
                        </small>
                        <small className="text-muted">
                          {activeTaskStats.assigned} tasks assigned
                        </small>
                      </div>
                    </Card.Body>
                  </Card>
                )}

                {/* Grouped Active Tasks */}
                <Row className="p-3">
                  {Object.entries(taskGroups).map(
                    ([groupName, tasksInGroup]) => (
                      <Col key={groupName} md={4} className="mb-4">
                        <Card className="h-100 shadow-sm border-0">
                          <Card.Header
                            className={`py-3 ${
                              groupName === "Critical & High"
                                ? "bg-danger text-white"
                                : groupName === "Medium"
                                ? "bg-warning text-dark"
                                : "bg-info text-white"
                            }`}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <h6 className="mb-0 fw-bold">{groupName}</h6>
                              <Badge bg="light" text="dark" pill>
                                {tasksInGroup.length}
                              </Badge>
                            </div>
                          </Card.Header>
                          <Card.Body
                            className="p-3"
                            style={{
                              minHeight: "400px",
                              maxHeight: "70vh",
                              overflowY: "auto",
                            }}
                          >
                            {tasksInGroup.length === 0 ? (
                              <div className="text-center text-muted py-4">
                                <p className="mt-2">
                                  No tasks in this category
                                </p>
                              </div>
                            ) : (
                              tasksInGroup
                                .filter((task) => task.status !== "cancelled") // Ensure no cancelled tasks show up
                                .map((task) => (
                                  <TaskCard
                                    key={task.id}
                                    task={task}
                                    getAssignedUsers={getAssignedUsers}
                                    currentUser={currentUser}
                                    onCancelTask={cancelTask}
                                    onReassignTask={handleTaskReassigned}
                                    showReassignButton={isTaskUnassigned(task)}
                                  />
                                ))
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    )
                  )}
                </Row>

                {filteredTasks.filter((t) => t.status !== "cancelled")
                  .length === 0 && (
                  <Card className="text-center m-3 shadow-sm border-0">
                    <Card.Body className="py-5">
                      <h4 className="mt-3">
                        {tasks.length === 0
                          ? "No active tasks"
                          : "No tasks match your filters"}
                      </h4>
                      <p className="text-muted">
                        {tasks.length === 0
                          ? "Get started by creating your first task"
                          : "Try adjusting your search criteria"}
                      </p>
                      {tasks.length > 0 && (
                        <Button
                          variant="primary"
                          onClick={clearFilters}
                          className="rounded-pill"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </Card.Body>
                  </Card>
                )}
              </Tab>
              <Tab
                eventKey="cancelled"
                title={
                  <span>
                    <BsArchive className="me-1" />
                    Cancelled Tasks (
                    {
                      filteredTasks.filter((t) => t.status === "cancelled")
                        .length
                    }
                    )
                  </span>
                }
              >
                {/* Cancelled tasks content remains the same */}
                <div className="p-3">
                  {/* Search and Project Filter for Cancelled Tasks */}
                  <Card className="mb-4 shadow-sm border-0">
                    <Card.Body className="py-3">
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">
                              Search Cancelled Tasks
                            </Form.Label>
                            <div className="position-relative">
                              <BsSearch className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                              <Form.Control
                                type="text"
                                placeholder="Search cancelled tasks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="ps-5"
                              />
                            </div>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">
                              Filter by Project
                            </Form.Label>
                            <div className="position-relative">
                              <BsFolder className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                              <Form.Select
                                value={selectedProject}
                                onChange={(e) =>
                                  setSelectedProject(e.target.value)
                                }
                                className="ps-5"
                              >
                                <option value="all">All Projects</option>
                                {projects.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </Form.Select>
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                  {/* Group Cancelled Tasks by Project */}
                  {(() => {
                    const filteredCancelledTasks = filteredTasks.filter(
                      (task) => task.status === "cancelled"
                    );

                    // Group by project
                    const tasksByProject = filteredCancelledTasks.reduce(
                      (groups, task) => {
                        const projectName = task.project?.name || "Unassigned";
                        if (!groups[projectName]) {
                          groups[projectName] = [];
                        }
                        groups[projectName].push(task);
                        return groups;
                      },
                      {}
                    );

                    return (
                      <Row>
                        {Object.entries(tasksByProject).map(
                          ([projectName, projectTasks]) => (
                            <Col
                              key={projectName}
                              md={6}
                              lg={4}
                              className="mb-4"
                            >
                              <Card className="h-100 shadow-sm border-0">
                                <Card.Header className="bg-secondary text-white py-3">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0 fw-bold">
                                      <BsFolder className="me-2" />
                                      {projectName}
                                    </h6>
                                    <Badge bg="light" text="dark" pill>
                                      {projectTasks.length}
                                    </Badge>
                                  </div>
                                </Card.Header>
                                <Card.Body
                                  className="p-3"
                                  style={{
                                    minHeight: "300px",
                                    maxHeight: "50vh",
                                    overflowY: "auto",
                                  }}
                                >
                                  {projectTasks.map((task) => (
                                    <TaskCard
                                      key={task.id}
                                      task={task}
                                      getAssignedUsers={getAssignedUsers}
                                      currentUser={currentUser}
                                      onCancelTask={cancelTask}
                                      onReassignTask={handleTaskReassigned}
                                      showReassignButton={false}
                                    />
                                  ))}
                                </Card.Body>
                              </Card>
                            </Col>
                          )
                        )}
                      </Row>
                    );
                  })()}

                  {filteredTasks.filter((t) => t.status === "cancelled")
                    .length === 0 && (
                    <Card className="text-center shadow-sm border-0">
                      <Card.Body className="py-5">
                        <BsArchive size={48} className="text-muted mb-3" />
                        <h5 className="text-muted">No cancelled tasks</h5>
                        <p className="text-muted">
                          Tasks that are cancelled will appear here
                        </p>
                      </Card.Body>
                    </Card>
                  )}
                </div>
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      ) : (
        /* UNASSIGNED TASKS VIEW */
        <Card className="mb-4 shadow-sm border-0">
          <Card.Body className="p-0">
            <div className="p-3 border-bottom">
              <h5 className="mb-0">
                <BsExclamationTriangle className="me-2 text-warning" />
                Tasks Needing Reassignment ({filteredTasks.length})
              </h5>
              <p className="text-muted mb-0">
                Assign these unassigned tasks to active team members
              </p>
            </div>

            {/* Simple filters for unassigned view */}
            <div className="p-3 border-bottom">
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-medium">Project</Form.Label>
                    <Form.Select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                    >
                      <option value="all">All Projects</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-medium">Priority</Form.Label>
                    <Form.Select
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value)}
                    >
                      <option value="all">All Priorities</option>
                      <option value="1">Critical</option>
                      <option value="2">High</option>
                      <option value="3">Medium</option>
                      <option value="4">Low</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button
                    variant="outline-secondary"
                    onClick={clearFilters}
                    className="w-100"
                  >
                    Clear Filters
                  </Button>
                </Col>
              </Row>
            </div>

            {/* Grouped Unassigned Tasks */}
            <Row className="p-3">
              {Object.entries(taskGroups).map(([groupName, tasksInGroup]) => (
                <Col key={groupName} md={4} className="mb-4">
                  <Card className="h-100 shadow-sm border-0">
                    <Card.Header
                      className={`py-3 ${
                        groupName === "Critical & High"
                          ? "bg-danger text-white"
                          : groupName === "Medium"
                          ? "bg-warning text-dark"
                          : "bg-info text-white"
                      }`}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold">{groupName}</h6>
                        <Badge bg="light" text="dark" pill>
                          {tasksInGroup.length}
                        </Badge>
                      </div>
                    </Card.Header>
                    <Card.Body
                      className="p-3"
                      style={{
                        minHeight: "400px",
                        maxHeight: "70vh",
                        overflowY: "auto",
                      }}
                    >
                      {tasksInGroup.length === 0 ? (
                        <div className="text-center text-muted py-4">
                          <p className="mt-2">
                            No unassigned tasks in this category
                          </p>
                        </div>
                      ) : (
                        tasksInGroup.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            getAssignedUsers={getAssignedUsers}
                            currentUser={currentUser}
                            onCancelTask={cancelTask}
                            onReassignTask={handleTaskReassigned}
                            showReassignButton={true}
                          />
                        ))
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {filteredTasks.length === 0 && (
              <Card className="text-center m-3 shadow-sm border-0">
                <Card.Body className="py-5">
                  <BsCheckCircle size={48} className="text-success mb-3" />
                  <h4 className="mt-3">All tasks are assigned!</h4>
                  <p className="text-muted">
                    There are currently no tasks needing reassignment.
                  </p>
                  <Button
                    variant="primary"
                    onClick={clearUnassignedFilter}
                    className="rounded-pill"
                  >
                    View All Tasks
                  </Button>
                </Card.Body>
              </Card>
            )}
          </Card.Body>
        </Card>
      )}

      {tasks.length === 0 && (
        <Card className="text-center my-5 shadow-sm border-0">
          <Card.Body className="py-5">
            <h4 className="mt-3">No tasks found</h4>
            <p className="text-muted">
              There are no tasks in your projects yet.
            </p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default ManagerTasks;
