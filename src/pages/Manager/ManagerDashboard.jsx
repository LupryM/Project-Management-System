import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  ProgressBar,
  ListGroup,
  Badge,
  Button,
  Dropdown,
  Alert,
  Modal,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  BsFolder,
  BsPeople,
  BsClock,
  BsCheckCircle,
  BsPauseCircle,
  BsXCircle,
  BsCalendar,
  BsBell,
  BsBellFill,
  BsExclamationTriangle,
  BsEnvelope,
  BsEnvelopeOpen,
  BsTrash,
  BsCheckAll,
} from "react-icons/bs";

const ManagerDashboard = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    teamMembers: 0,
    tasksInProgress: 0,
    tasksCompleted: 0,
    tasksOnHold: 0,
    tasksCancelled: 0,
    unassignedTasks: 0,
  });
  const [projects, setProjects] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managerName, setManagerName] = useState("Manager");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const navigate = useNavigate();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user) return;
      const userId = currentUser.user.id;

      // profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single();
      setManagerName(
        profile ? `${profile.first_name} ${profile.last_name}` : "Manager"
      );

      // projects
      const { data: projects = [], error: projectsError } = await supabase
        .from("projects")
        .select("id, name, description, status")
        .eq("manager_id", userId);
      if (projectsError) throw projectsError;

      const projectIds = projects.map((p) => p.id || null).filter(Boolean);
      const totalProjects = projects.length;

      // team members (guard empty projectIds)
      let uniqueTeamMembers = [];
      if (projectIds.length > 0) {
        const { data: teamMembersData = [] } = await supabase
          .from("team_members")
          .select("user_id")
          .in("team_id", projectIds);
        uniqueTeamMembers = [
          ...new Set(teamMembersData.map((tm) => tm.user_id)),
        ];
      }

      // Fetch ALL tasks for these projects in one go (include assignments)
      let allTasks = [];
      if (projectIds.length > 0) {
        const { data: tasksData = [], error: tasksError } = await supabase
          .from("tasks")
          .select(
            `
          id,
          status,
          priority,
          project_id,
          title,
          due_date,
          created_at,
          assignments:task_assignments(id)
        `
          )
          .in("project_id", projectIds);
        if (tasksError) throw tasksError;
        allTasks = tasksData;
      }

      // helper: normalize statuses for comparisons (doesn't change DB)
      const norm = (s) =>
        (s || "").toString().toLowerCase().replace(/\s+/g, "_");

      // compute task-level counts (exclude cancelled where appropriate)
      const taskCounts = {
        total: 0,
        inProgress: 0,
        completed: 0,
        onHold: 0,
        cancelled: 0,
        todo: 0,
      };
      let unassignedTasksCount = 0;
      const priorityCounts = { 1: 0, 2: 0, 3: 0, 4: 0, unknown: 0 };

      allTasks.forEach((t) => {
        const s = norm(t.status);
        taskCounts.total += 1;
        if (s === "in_progress") taskCounts.inProgress += 1;
        if (s === "completed") taskCounts.completed += 1; // works for 'Completed' or 'completed'
        if (s === "on_hold") taskCounts.onHold += 1;
        if (s === "cancelled") taskCounts.cancelled += 1;
        if (s === "todo") taskCounts.todo += 1;

        // unassigned: same logic as before, but defensive
        const hasAssignments =
          Array.isArray(t.assignments) && t.assignments.length > 0;
        if (!hasAssignments && (s === "todo" || s === "in_progress")) {
          unassignedTasksCount += 1;
        }

        // priority counts (exclude cancelled tasks if you want)
        const isActive = s !== "cancelled"; // exclude cancelled from priority totals
        const pKey = t.priority ?? "unknown";
        if (isActive) {
          priorityCounts[pKey] = (priorityCounts[pKey] || 0) + 1;
        }
      });

      // per-project details (exclude cancelled tasks from denominators)
      const projectsWithDetails = (projects || []).map((project) => {
        const tasksForProject = allTasks.filter(
          (t) => t.project_id === project.id
        );
        const activeTasks = tasksForProject.filter(
          (t) => norm(t.status) !== "cancelled"
        );
        const completedTasks = activeTasks.filter(
          (t) => norm(t.status) === "completed"
        ).length;
        const totalActive = activeTasks.length;
        const progress =
          totalActive > 0
            ? Math.round((completedTasks / totalActive) * 100)
            : 0;
        return {
          ...project,
          completedTasks,
          totalTasks: totalActive, // now EXCLUDES cancelled tasks
          progress,
        };
      });

      // recent tasks (sort by created_at desc)
      const recentTasksSorted = [...allTasks]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      // set states
      setStats({
        totalProjects,
        teamMembers: uniqueTeamMembers.length,
        tasksInProgress: taskCounts.inProgress,
        tasksCompleted: taskCounts.completed,
        tasksOnHold: taskCounts.onHold,
        tasksCancelled: taskCounts.cancelled,
        unassignedTasks: unassignedTasksCount,
      });

      setProjects(projectsWithDetails);
      setRecentTasks(recentTasksSorted);

      // OPTIONAL: if you want to show priority counts in UI, create state and set it:
      // setPriorityCounts(priorityCounts);
    } catch (error) {
      console.error("Error fetching dashboard stats (refactor):", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user) return;

      // Get notifications for this manager
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          actor:profiles!notifications_actor_id_fkey(first_name, last_name),
          task:tasks(title, project_id),
          project:projects(name)
        `
        )
        .eq("user_id", currentUser.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);

      // Calculate unread count
      const unread =
        data?.filter((notification) => !notification.read)?.length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user) return;

      // Check if notification is already read to avoid unnecessary updates
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification?.read) return;

      // Update in database
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", currentUser.user.id);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAsRead(true);
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user) return;

      // Only update if there are unread notifications
      if (unreadCount === 0) return;

      // Update all unread notifications in database
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", currentUser.user.id)
        .eq("read", false);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setMarkingAsRead(false);
    }
  };

  const deleteNotification = async (notificationId, e) => {
    // Stop propagation to prevent triggering the notification click
    if (e) e.stopPropagation();

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user) return;

      const notificationToDelete = notifications.find(
        (n) => n.id === notificationId
      );
      const wasUnread = notificationToDelete && !notificationToDelete.read;

      // Delete from database
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", currentUser.user.id);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );

      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user) return;

      // Only proceed if there are notifications to clear
      if (notifications.length === 0) return;

      // Delete all notifications from database
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", currentUser.user.id);

      if (error) throw error;

      // Update local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked if it's unread
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Handle navigation based on notification type
    let navigatePath = "/";

    switch (notification.type) {
      case "task_reassignment_needed":
        navigatePath = "/Mtasks?filter=unassigned";
        break;
      case "task_assigned":
      case "task_updated":
        if (notification.task && notification.task.id) {
          navigatePath = `/tasks/${notification.task.id}`;
        } else {
          navigatePath = "/tasks";
        }
        break;
      case "project_updated":
        if (notification.project && notification.project.id) {
          navigatePath = `/projects/${notification.project.id}`;
        } else {
          navigatePath = "/projects";
        }
        break;
      default:
        navigatePath = "/";
    }

    navigate(navigatePath);
    setShowNotifications(false);
    setShowNotificationsModal(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "task_reassignment_needed":
        return <BsExclamationTriangle className="text-warning" />;
      case "task_assigned":
        return <BsPeople className="text-info" />;
      case "task_updated":
        return <BsClock className="text-primary" />;
      case "project_updated":
        return <BsFolder className="text-success" />;
      default:
        return <BsBell className="text-primary" />;
    }
  };

  const formatNotificationMessage = (notification) => {
    const actorName = notification.actor
      ? `${notification.actor.first_name} ${notification.actor.last_name}`
      : "Someone";

    switch (notification.type) {
      case "task_reassignment_needed":
        return (
          <>
            <strong>Task needs reassignment:</strong> {notification.message}
          </>
        );
      case "task_assigned":
        return (
          <>
            <strong>{actorName}</strong> assigned you to a task:{" "}
            {notification.message}
          </>
        );
      case "task_updated":
        return (
          <>
            <strong>{actorName}</strong> updated a task: {notification.message}
          </>
        );
      case "project_updated":
        return (
          <>
            <strong>Project update:</strong> {notification.message}
          </>
        );
      default:
        return notification.message;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return notificationTime.toLocaleDateString();
  };

  const handleViewReassignmentTasks = () => {
    navigate("/Mtasks?filter=unassigned");
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      1: "danger",
      2: "warning",
      3: "info",
      4: "secondary",
    };

    const labels = {
      1: "Critical",
      2: "High",
      3: "Medium",
      4: "Low",
    };

    return <Badge bg={variants[priority]}>{labels[priority]}</Badge>;
  };

  const getStatusBadge = (status) => {
    const variants = {
      todo: "secondary",
      in_progress: "primary",
      Completed: "success",
      on_hold: "warning",
      cancelled: "danger",
    };

    const icons = {
      todo: <BsClock className="me-1" />,
      in_progress: <BsClock className="me-1" />,
      Completed: <BsCheckCircle className="me-1" />,
      on_hold: <BsPauseCircle className="me-1" />,
      cancelled: <BsXCircle className="me-1" />,
    };

    const labels = {
      todo: "To Do",
      in_progress: "In Progress",
      Completed: "Completed",
      cancelled: "Cancelled",
    };

    return (
      <Badge bg={variants[status]} className="d-flex align-items-center">
        {icons[status]}
        {labels[status]}
      </Badge>
    );
  };

  useEffect(() => {
    fetchStats();
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <Container
        fluid
        className="p-4 text-center"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>
          <Spinner animation="border" role="status" className="me-2" />
          <span>Loading your dashboard...</span>
        </div>
      </Container>
    );
  }

  const tasksNeedingReassignmentCount = stats.unassignedTasks || 0;

  return (
    <Container fluid className="p-4 bg-light" style={{ minHeight: "100vh" }}>
      {/* Header with Notification Bell */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="fw-bold">Welcome back, {managerName}</h2>
          <p className="text-muted">
            Here's an overview of your projects and tasks
          </p>
        </Col>
        <Col xs="auto">
          <Dropdown
            show={showNotifications}
            onToggle={(show) => setShowNotifications(show)}
            align="end"
          >
            <Dropdown.Toggle
              variant="outline-primary"
              className="position-relative"
            >
              {unreadCount > 0 ? (
                <BsBellFill className="text-warning" />
              ) : (
                <BsBell />
              )}
              {unreadCount > 0 && (
                <Badge
                  bg="danger"
                  pill
                  className="position-absolute top-0 start-100 translate-middle"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Dropdown.Toggle>

            <Dropdown.Menu
              style={{ width: "400px", maxHeight: "500px", overflowY: "auto" }}
            >
              <Dropdown.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <span>Notifications</span>
                  <div>
                    {unreadCount > 0 && (
                      <Badge bg="primary" pill className="me-2">
                        {unreadCount} unread
                      </Badge>
                    )}
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 text-muted"
                      onClick={() => setShowNotificationsModal(true)}
                    >
                      View All
                    </Button>
                  </div>
                </div>
              </Dropdown.Header>

              {notificationsLoading ? (
                <Dropdown.ItemText>
                  <div className="text-center py-2">
                    <Spinner animation="border" size="sm" />
                    <span className="ms-2">Loading notifications...</span>
                  </div>
                </Dropdown.ItemText>
              ) : notifications.length === 0 ? (
                <Dropdown.ItemText className="text-muted text-center py-3">
                  No notifications
                </Dropdown.ItemText>
              ) : (
                <>
                  {notifications.slice(0, 5).map((notification) => (
                    <Dropdown.Item
                      key={notification.id}
                      className={`py-3 border-bottom ${
                        !notification.read ? "bg-light" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="d-flex align-items-start">
                        <div className="me-3 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="small text-muted">
                              {formatTimeAgo(notification.created_at)}
                            </div>
                            <div className="d-flex">
                              {!notification.read && (
                                <BsEnvelope
                                  className="text-primary me-1"
                                  size={12}
                                />
                              )}
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 text-muted ms-1"
                                onClick={(e) =>
                                  deleteNotification(notification.id, e)
                                }
                              >
                                <BsTrash size={12} />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-1">
                            {formatNotificationMessage(notification)}
                          </div>
                          {notification.task && (
                            <Badge bg="light" text="dark" className="mt-1">
                              Task: {notification.task.title}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Dropdown.Item>
                  ))}

                  {notifications.length > 5 && (
                    <Dropdown.Item
                      className="text-center text-primary"
                      onClick={() => setShowNotificationsModal(true)}
                    >
                      View all {notifications.length} notifications
                    </Dropdown.Item>
                  )}
                </>
              )}

              {notifications.length > 0 && (
                <>
                  <Dropdown.Divider />
                  <div className="px-3 py-2">
                    <div className="d-flex justify-content-between">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        disabled={unreadCount === 0 || markingAsRead}
                        onClick={markAllAsRead}
                      >
                        {markingAsRead ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <>
                            <BsCheckAll className="me-1" />
                            Mark all read
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={clearAllNotifications}
                      >
                        <BsTrash className="me-1" />
                        Clear all
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>

      {/* Notifications Modal */}
      <Modal
        show={showNotificationsModal}
        onHide={() => setShowNotificationsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>All Notifications</Modal.Title>
          <div className="ms-auto">
            {unreadCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                disabled={unreadCount === 0 || markingAsRead}
                onClick={markAllAsRead}
                className="me-2"
              >
                {markingAsRead ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <>
                    <BsCheckAll className="me-1" />
                    Mark all read
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline-danger"
              size="sm"
              onClick={clearAllNotifications}
            >
              <BsTrash className="me-1" />
              Clear all
            </Button>
          </div>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {notificationsLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <div className="mt-2">Loading notifications...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <BsBell size={48} className="mb-3" />
              <div>No notifications</div>
            </div>
          ) : (
            <ListGroup variant="flush">
              {notifications.map((notification) => (
                <ListGroup.Item
                  key={notification.id}
                  className={`px-0 ${!notification.read ? "bg-light" : ""}`}
                  action
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="d-flex align-items-start">
                    <div className="me-3 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="small text-muted">
                          {formatTimeAgo(notification.created_at)}
                        </div>
                        <div className="d-flex">
                          {!notification.read ? (
                            <BsEnvelope className="text-primary me-2" />
                          ) : (
                            <BsEnvelopeOpen className="text-muted me-2" />
                          )}
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-muted"
                            onClick={(e) =>
                              deleteNotification(notification.id, e)
                            }
                          >
                            <BsTrash size={14} />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-1">
                        {formatNotificationMessage(notification)}
                      </div>
                      {notification.task && (
                        <Badge bg="light" text="dark" className="mt-1 me-1">
                          Task: {notification.task.title}
                        </Badge>
                      )}
                      {notification.project && (
                        <Badge bg="light" text="dark" className="mt-1">
                          Project: {notification.project.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
      </Modal>

      {/* Alert for tasks needing reassignment */}
      {tasksNeedingReassignmentCount > 0 && (
        <Alert variant="warning" className="mb-4">
          <div className="d-flex align-items-center">
            <BsExclamationTriangle className="me-2" size={20} />
            <div>
              <strong>Attention Required:</strong> You have{" "}
              {tasksNeedingReassignmentCount} task(s) that need reassignment due
              to user deactivation.
            </div>
          </div>
          <div className="mt-2">
            <Button
              variant="outline-warning"
              size="sm"
              onClick={handleViewReassignmentTasks}
            >
              View Tasks Needing Reassignment
            </Button>
          </div>
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                  <BsFolder className="text-primary" size={24} />
                </div>
                <div>
                  <h4 className="mb-0">{stats.totalProjects}</h4>
                  <p className="text-muted mb-0">Projects</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded me-3">
                  <BsPeople className="text-success" size={24} />
                </div>
                <div>
                  <h4 className="mb-0">{stats.teamMembers}</h4>
                  <p className="text-muted mb-0">Team Members</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded me-3">
                  <BsClock className="text-warning" size={24} />
                </div>
                <div>
                  <h4 className="mb-0">{stats.tasksInProgress}</h4>
                  <p className="text-muted mb-0">In Progress</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center">
                <div className="bg-danger bg-opacity-10 p-3 rounded me-3">
                  <BsExclamationTriangle className="text-danger" size={24} />
                </div>
                <div>
                  <h4 className="mb-0">{stats.unassignedTasks}</h4>
                  <p className="text-muted mb-0">Unassigned Tasks</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Projects Section */}
        <Col md={8} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0 d-flex align-items-center">
                <BsFolder className="me-2" /> Your Projects
              </h5>
            </Card.Header>
            <Card.Body>
              {projects.length > 0 ? (
                <div>
                  {projects.map((project) => (
                    <div key={project.id} className="mb-4 pb-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-0">{project.name}</h6>
                        <Badge bg="light" text="dark">
                          {project.completedTasks}/{project.totalTasks} tasks
                        </Badge>
                      </div>
                      <p className="text-muted small mb-2">
                        {project.description || "No description"}
                      </p>

                      <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="text-muted">Progress</small>
                          <small className="fw-medium">
                            {project.progress}%
                          </small>
                        </div>
                        <ProgressBar
                          now={project.progress}
                          variant={
                            project.progress === 100 ? "success" : "primary"
                          }
                          className="rounded-pill"
                          style={{ height: "8px" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted">
                  <BsFolder size={32} className="mb-2" />
                  <p>No projects found</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Tasks Section */}
        <Col md={4} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0 d-flex align-items-center">
                <BsClock className="me-2" /> Recent Tasks
              </h5>
            </Card.Header>
            <Card.Body>
              {recentTasks.length > 0 ? (
                <ListGroup variant="flush">
                  {recentTasks.map((task) => (
                    <ListGroup.Item
                      key={task.id}
                      className="px-0 py-3 border-bottom"
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <h6 className="mb-0">{task.title}</h6>
                        {getPriorityBadge(task.priority)}
                      </div>
                      <div className="mb-2">{getStatusBadge(task.status)}</div>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          {task.projects?.name}
                        </small>
                        {task.due_date && (
                          <small className="text-muted">
                            <BsCalendar className="me-1" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </small>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-4 text-muted">
                  <BsClock size={32} className="mb-2" />
                  <p>No recent tasks</p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Task Status Overview */}
          <Card className="border-0 shadow-sm mt-4">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">Task Overview</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted">Completed</span>
                <div className="d-flex align-items-center">
                  <span className="fw-medium me-2">{stats.tasksCompleted}</span>
                  <BsCheckCircle className="text-success" />
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted">In Progress</span>
                <div className="d-flex align-items-center">
                  <span className="fw-medium me-2">
                    {stats.tasksInProgress}
                  </span>
                  <BsClock className="text-primary" />
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted">On Hold</span>
                <div className="d-flex align-items-center">
                  <span className="fw-medium me-2">{stats.tasksOnHold}</span>
                  <BsPauseCircle className="text-warning" />
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Cancelled</span>
                <div className="d-flex align-items-center">
                  <span className="fw-medium me-2">{stats.tasksCancelled}</span>
                  <BsXCircle className="text-danger" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ManagerDashboard;
