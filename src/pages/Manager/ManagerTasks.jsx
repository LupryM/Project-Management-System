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
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { Link } from "react-router-dom";

// ----- Comments component -----
const TaskComments = ({ taskId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_comments")
      .select(`
        comment_id,
        comment_text,
        created_at,
        profiles:user_id (first_name, last_name)
      `)
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
    fetchComments();

    const subscription = supabase
      .channel(`comments-task-${taskId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` },
        (payload) => {
          setComments((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [taskId]);

  if (loading) return <Spinner animation="border" size="sm" />;

  return (
    <div className="mt-2">
      {error && <Alert variant="danger">{error}</Alert>}
      <ListGroup className="mb-2">
        {comments.length === 0 && <ListGroup.Item>No comments yet</ListGroup.Item>}
        {comments.map((c) => (
          <ListGroup.Item key={c.comment_id}>
            <strong>{c.profiles?.first_name || "User"}:</strong> {c.comment_text}{" "}
            <small className="text-muted">
              ({new Date(c.created_at).toLocaleString()})
            </small>
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
          />
          <Button type="submit" size="sm">
            Add
          </Button>
        </Form.Group>
      </Form>
    </div>
  );
};

const ManagerTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCurrentUser();
    fetchProjects();
    fetchTasks();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setCurrentUser(user);
    } catch (err) {
      console.error("Error fetching current user:", err.message);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name");
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
      
      // Use the exact same query structure as TaskList
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assignments:task_assignments(
            user:profiles(id, first_name, last_name)
          ),
          project:projects(id, name)
        `)
        .order("due_date", { ascending: true });
        
      if (error) throw error;
      setTasks(data || []);
      setFilteredTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err.message);
      setError("Error loading tasks: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filters
  useEffect(() => {
    let filtered = tasks;
    if (selectedProject !== "all")
      filtered = filtered.filter((t) => t.project_id == selectedProject);
    if (selectedPriority !== "all") {
      const map = {
        1: "critical",
        2: "high",
        3: "medium",
        4: "low",
        5: "lowest",
      };
      filtered = filtered.filter((t) => map[t.priority] === selectedPriority);
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
  }, [tasks, selectedProject, selectedPriority, selectedStatus, searchTerm]);

  const clearFilters = () => {
    setSelectedProject("all");
    setSelectedPriority("all");
    setSelectedStatus("all");
    setSearchTerm("");
  };

  // Helper function to get assigned users (same as in TaskList)
  const getAssignedUsers = (task) => {
    if (!task.assignments || task.assignments.length === 0) return "Unassigned";
    
    return task.assignments
      .filter((assignment) => assignment.user !== null)
      .map((assignment) => 
        `${assignment.user.first_name || ""} ${assignment.user.last_name || ""}`.trim()
      )
      .filter(name => name) // Remove empty strings
      .join(", ") || "Unassigned";
  };

  // Calculate stats for dashboard
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    todo: tasks.filter((t) => t.status === "todo").length,
    critical: tasks.filter((t) => t.priority === 1).length,
    high: tasks.filter((t) => t.priority === 2).length,
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
      <Container fluid className="p-4 text-center my-5">
        <Spinner animation="border" role="status" />
        <h4 className="mt-3">Loading tasks...</h4>
      </Container>
    );

  return (
    <Container fluid className="p-4">
      {/* Header with Stats */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2>Task Management Dashboard</h2>
          <p className="text-muted">View and manage your team's tasks</p>
        </Col>
        <Col xs="auto">
          <Button variant="outline-primary" onClick={fetchTasks}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </Button>
        </Col>
      </Row>

      {/* Stats Overview */}
      <Row className="mb-4">
        <Col md={2}>
          <Card className="text-center border-0 bg-light">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-primary">{taskStats.total}</h4>
              <small>Total Tasks</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-0 bg-light">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-success">{taskStats.completed}</h4>
              <small>Completed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-0 bg-light">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-warning">{taskStats.inProgress}</h4>
              <small>In Progress</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-0 bg-light">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-info">{taskStats.todo}</h4>
              <small>To Do</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-0 bg-light">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-danger">
                {taskStats.critical + taskStats.high}
              </h4>
              <small>High Priority</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-0 bg-light">
            <Card.Body className="py-3">
              <h4 className="mb-0 text-primary">
                {taskStats.total > 0
                  ? Math.round((taskStats.completed / taskStats.total) * 100)
                  : 0}
                %
              </h4>
              <small>Completion Rate</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Project</Form.Label>
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
            <Col md={2}>
              <Form.Group>
                <Form.Label>Priority</Form.Label>
                <Form.Select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Search Tasks</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button
                variant="outline-secondary"
                onClick={clearFilters}
                className="w-100"
              >
                <i className="bi bi-x-circle me-1"></i>
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Progress Bar */}
      {taskStats.total > 0 && (
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between mb-1">
              <span>Project Completion</span>
              <span>
                {Math.round((taskStats.completed / taskStats.total) * 100)}%
              </span>
            </div>
            <ProgressBar
              now={(taskStats.completed / taskStats.total) * 100}
              variant="success"
            />
          </Card.Body>
        </Card>
      )}

      {/* Grouped Tasks */}
      <Row>
        {Object.entries(taskGroups).map(([groupName, tasksInGroup]) => (
          <Col key={groupName} md={4} className="mb-4">
            <Card className="h-100">
              <Card.Header
                className={`py-2 ${
                  groupName === "Critical & High"
                    ? "bg-danger text-white"
                    : groupName === "Medium"
                    ? "bg-warning text-dark"
                    : "bg-info text-white"
                }`}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">{groupName}</h6>
                  <Badge bg="light" text="dark" pill>
                    {tasksInGroup.length}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body
                className="p-2"
                style={{
                  minHeight: "200px",
                  maxHeight: "70vh",
                  overflowY: "auto",
                }}
              >
                {tasksInGroup.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-inbox display-6"></i>
                    <p className="mt-2">No tasks in this category</p>
                  </div>
                ) : (
                  tasksInGroup.map((task) => (
                    <TaskCard key={task.id} task={task} getAssignedUsers={getAssignedUsers} currentUser={currentUser} />
                  ))
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {filteredTasks.length === 0 && tasks.length > 0 && (
        <Card className="text-center my-5">
          <Card.Body className="py-5">
            <i className="bi bi-funnel display-4 text-muted"></i>
            <h4 className="mt-3">No tasks match your filters</h4>
            <p className="text-muted">Try adjusting your search criteria</p>
            <Button variant="primary" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </Card.Body>
        </Card>
      )}

      {tasks.length === 0 && (
        <Card className="text-center my-5">
          <Card.Body className="py-5">
            <i className="bi bi-clipboard-check display-4 text-muted"></i>
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

// Enhanced TaskCard component
const TaskCard = ({ task, getAssignedUsers, currentUser }) => {
  const [showDetails, setShowDetails] = useState(false);

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

  const getStatusVariant = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "primary";
      case "todo":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "bi-check-circle-fill";
      case "in_progress":
        return "bi-arrow-repeat";
      case "todo":
        return "bi-circle";
      default:
        return "bi-circle";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && task.status !== "completed";
  };

  return (
    <>
      <Card
        onClick={() => setShowDetails(true)}
        className="mb-2 shadow-sm task-card"
        style={{ cursor: "pointer" }}
      >
        <Card.Body className="p-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="mb-0 task-title">{task.title}</h6>
            <Badge bg={getPriorityVariant(task.priority)} pill>
              {getPriorityText(task.priority)}
            </Badge>
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
              className="d-flex align-items-center"
            >
              <i className={`bi ${getStatusIcon(task.status)} me-1`}></i>
              {task.status.replace("_", " ")}
            </Badge>

            <div
              className={`due-date ${
                isOverdue(task.due_date) ? "text-danger" : "text-muted"
              }`}
            >
              <i className="bi bi-calendar-event me-1"></i>
              {formatDate(task.due_date)}
            </div>
          </div>

          <div className="d-flex justify-content-between">
            <small className="text-muted">
              <i className="bi bi-person me-1"></i>
              {getAssignedUsers(task)}
            </small>

            {task.project && (
              <small className="text-primary">
                <i className="bi bi-folder me-1"></i>
                {task.project.name}
              </small>
            )}
          </div>
        </Card.Body>
      </Card>

      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{task.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={8}>
              <h6>Description</h6>
              <p>{task.description || "No description provided"}</p>
              
              {/* Comments Section */}
              {currentUser && <TaskComments taskId={task.id} currentUser={currentUser} />}
            </Col>
            <Col md={4}>
              <h6>Details</h6>
              <div className="mb-2">
                <strong>Status:</strong>{" "}
                <Badge bg={getStatusVariant(task.status)}>
                  {task.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="mb-2">
                <strong>Priority:</strong>{" "}
                <Badge bg={getPriorityVariant(task.priority)}>
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
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>
          <Button as={Link} to={`/task/${task.id}`} variant="primary">
            <i className="bi bi-pencil me-1"></i>
            Edit Task
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ManagerTasks;