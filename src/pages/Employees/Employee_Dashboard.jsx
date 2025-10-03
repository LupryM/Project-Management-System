import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Alert,
  ProgressBar,
  Button,
  Spinner,
  ListGroup,
  Dropdown,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import Notifications from "../../lib/notifications";
import {
  BsCheckCircleFill,
  BsClockFill,
  BsListTask,
  BsExclamationTriangleFill,
  BsCalendar,
  BsPerson,
  BsGraphUp,
  BsArrowRight,
  BsBell,
  BsBellFill,
} from "react-icons/bs";

// ----- Supabase fetchers (same as Employee Task List) -----
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

async function fetchMyTasks(userId) {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      id, title, description, status, priority, due_date, created_by, updated_at, project_id,
      project:projects ( id, name ),
      task_assignments!inner ( user_id )
    `
    )
    .eq("task_assignments.user_id", userId);

  if (error) throw error;
  return (data || []).map((t) => ({
    ...t,
    status: t.status || "todo",
    priority: Number(t.priority) || 3,
  }));
}

// NEW: Fetch notifications for employee
async function fetchEmployeeNotifications(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      *,
      project:projects ( name ),
      task:tasks ( title ),
      actor:profiles!notifications_actor_id_fkey ( first_name, last_name, email )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

// NEW: Mark notification as read
async function markNotificationAsRead(notificationId) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

// NEW: Mark all notifications as read
async function markAllNotificationsAsRead(userId) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
}

const EmployeeDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // NEW: Notification state
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);

        // Get current user (same as Employee Task List)
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          // Fetch tasks using the same function as Employee Task List
          const userTasks = await fetchMyTasks(currentUser.id);
          setTasks(userTasks);

          // NEW: Fetch notifications for employee
          await fetchNotifications(currentUser.id);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err.message);
        setError("Error loading dashboard: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // NEW: Fetch notifications function
  const fetchNotifications = async (userId) => {
    try {
      setNotificationsLoading(true);
      const userNotifications = await fetchEmployeeNotifications(userId);
      setNotifications(userNotifications);
    } catch (err) {
      console.error("Error fetching notifications:", err.message);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // NEW: Handle mark as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err.message);
    }
  };

  // NEW: Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err.message);
    }
  };

  // NEW: Get unread notification count
  const unreadCount = notifications.filter((notif) => !notif.is_read).length;

  // Calculate stats from tasks (same status values as Employee Task List)
  const taskStats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    on_hold: tasks.filter((t) => t.status === "on_hold").length,
    Completed: tasks.filter((t) => t.status === "Completed").length,
  };

  // Get upcoming tasks (due in the next 7 days)
  const upcomingTasks = tasks
    .filter((task) => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      return dueDate >= today && dueDate <= nextWeek;
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const getPriorityVariant = (priority) => {
    const variantMap = {
      1: "danger",
      2: "warning",
      3: "primary",
      4: "secondary",
    };
    return variantMap[priority] || "secondary";
  };

  const getPriorityText = (priority) => {
    const textMap = {
      1: "Critical",
      2: "High",
      3: "Medium",
      4: "Low",
    };
    return textMap[priority] || "Low";
  };

  // NEW: Format notification time
  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // NEW: Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "project_created":
      case "project_updated":
        return <BsBellFill className="text-primary" />;
      case "task_assigned":
        return <BsListTask className="text-info" />;
      case "task_reassignment_needed":
        return <BsExclamationTriangleFill className="text-warning" />;
      default:
        return <BsBell className="text-secondary" />;
    }
  };

  // Calculate completion percentage
  const completionPercentage =
    taskStats.total > 0
      ? Math.round((taskStats.Completed / taskStats.total) * 100)
      : 0;

  if (loading) {
    return (
      <Container fluid className="py-4 bg-light" style={{ minHeight: "100vh" }}>
        <div className="text-center my-5 py-5">
          <Spinner animation="border" role="status" className="mb-3" />
          <p>Loading your dashboard...</p>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container fluid className="py-4 bg-light" style={{ minHeight: "100vh" }}>
        <div className="text-center my-5 py-5">
          <BsPerson size={48} className="text-muted mb-3" />
          <h4>Please sign in to view your dashboard</h4>
          <p className="text-muted">
            You need to be authenticated to access your dashboard
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 bg-light" style={{ minHeight: "100vh" }}>
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="mb-1 fw-bold">Dashboard</h2>
              <p className="text-muted mb-0">
                Welcome back, <strong>{user.email}</strong>
              </p>
            </div>
            <div className="d-flex gap-2">
              {/* ENHANCED: Custom Notifications Dropdown */}
              <Dropdown
                show={showNotifications}
                onToggle={(show) => setShowNotifications(show)}
                align="end"
              >
                <Dropdown.Toggle
                  variant="outline-secondary"
                  className="position-relative"
                >
                  <BsBell />
                  {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {unreadCount}
                    </span>
                  )}
                </Dropdown.Toggle>

                <Dropdown.Menu
                  style={{
                    minWidth: "400px",
                    maxHeight: "500px",
                    overflowY: "auto",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                    <h6 className="mb-0">Notifications</h6>
                    {unreadCount > 0 && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                      >
                        Mark all as read
                      </Button>
                    )}
                  </div>

                  {notificationsLoading ? (
                    <div className="text-center p-3">
                      <Spinner animation="border" size="sm" />
                      <p className="mt-2 mb-0">Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center p-4">
                      <BsBell className="text-muted mb-2" size={24} />
                      <p className="text-muted mb-0">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <Dropdown.Item
                        key={notification.id}
                        className={`p-3 border-bottom ${
                          !notification.is_read ? "bg-light" : ""
                        }`}
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <div className="d-flex align-items-start">
                          <div className="me-3 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-1 small">{notification.message}</p>
                            <div className="d-flex justify-content-between align-items-center">
                              <small className="text-muted">
                                {(notification.actor &&
                                  `${notification.actor.first_name || ""} ${
                                    notification.actor.last_name || ""
                                  }`.trim()) ||
                                  "System"}
                              </small>
                              <small className="text-muted">
                                {formatNotificationTime(
                                  notification.created_at
                                )}
                              </small>
                            </div>
                          </div>
                        </div>
                      </Dropdown.Item>
                    ))
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>
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
          <BsExclamationTriangleFill className="me-2" />
          {error}
        </Alert>
      )}

      {/* Stats Overview Cards */}
      <Row className="mb-4">
        <Col md={6} lg={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="card-title text-muted">Total Tasks</h6>
                <h3 className="mb-0">{taskStats.total}</h3>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded">
                <BsListTask size={24} className="text-primary" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="card-title text-muted">In Progress</h6>
                <h3 className="mb-0">{taskStats.in_progress}</h3>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded">
                <BsClockFill size={24} className="text-primary" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="card-title text-muted">Completed</h6>
                <h3 className="mb-0">{taskStats.Completed}</h3>
              </div>
              <div className="bg-success bg-opacity-10 p-3 rounded">
                <BsCheckCircleFill size={24} className="text-success" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="card-title text-muted">Completion</h6>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <BsGraphUp size={24} className="text-info" />
                </div>
              </div>
              <h3 className="mb-2">{completionPercentage}%</h3>
              <ProgressBar
                now={completionPercentage}
                variant={completionPercentage === 100 ? "success" : "primary"}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Upcoming Tasks Section */}
      <Row>
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0 d-flex align-items-center">
                <BsCalendar className="me-2" /> Upcoming Tasks
              </h5>
            </Card.Header>
            <Card.Body>
              {upcomingTasks.length > 0 ? (
                <div className="list-group list-group-flush">
                  {upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="list-group-item border-0 px-0"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{task.title}</h6>
                          <p className="text-muted mb-0 small">
                            {task.project?.name || "No Project"}
                          </p>
                        </div>
                        <div className="text-end">
                          <Badge
                            bg={getPriorityVariant(task.priority)}
                            className="mb-1"
                          >
                            {getPriorityText(task.priority)}
                          </Badge>
                          <p className="text-muted mb-0 small">
                            Due:{" "}
                            {task.due_date
                              ? new Date(task.due_date).toLocaleDateString()
                              : "No due date"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BsCalendar size={36} className="text-muted mb-2" />
                  <p className="text-muted mb-0">No upcoming tasks</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100 mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Task Status</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">To Do</span>
                  <span className="fw-bold">{taskStats.todo}</span>
                </div>
                <ProgressBar
                  now={
                    taskStats.total
                      ? (taskStats.todo / taskStats.total) * 100
                      : 0
                  }
                  variant="secondary"
                />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">In Progress</span>
                  <span className="fw-bold">{taskStats.in_progress}</span>
                </div>
                <ProgressBar
                  now={
                    taskStats.total
                      ? (taskStats.in_progress / taskStats.total) * 100
                      : 0
                  }
                  variant="primary"
                />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">On Hold</span>
                  <span className="fw-bold">{taskStats.on_hold}</span>
                </div>
                <ProgressBar
                  now={
                    taskStats.total
                      ? (taskStats.on_hold / taskStats.total) * 100
                      : 0
                  }
                  variant="warning"
                />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">Completed</span>
                  <span className="fw-bold">{taskStats.Completed}</span>
                </div>
                <ProgressBar
                  now={
                    taskStats.total
                      ? (taskStats.Completed / taskStats.total) * 100
                      : 0
                  }
                  variant="success"
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeDashboard;
