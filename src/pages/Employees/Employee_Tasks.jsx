import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Dropdown,
  Form,
  Modal,
  Row,
  Spinner,
  ListGroup,
  Alert,
  Nav,
  Tab,
} from "react-bootstrap";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { logActivity } from "../../lib/logger";
import {
  BsSearch,
  BsPlusCircle,
  BsThreeDotsVertical,
  BsCalendar,
  BsFolder,
  BsCheckCircle,
  BsCircle,
  BsClockHistory,
  BsExclamationCircle,
  BsExclamationTriangle,
  BsExclamationDiamond,
  BsExclamationOctagon,
  BsChat,
  BsTrash,
  BsPencil,
  BsArrowRepeat,
  BsFilter,
  BsPersonPlus,
  BsSortDown,
  BsKanban,
  BsListTask,
  BsGrid3X3,
  BsPauseCircle,
  BsColumnsGap,
  BsLightning,
  BsXCircle,
  BsArchive,
} from "react-icons/bs";

// ----- Helpers & Mappings -----
const STATUS = [
  {
    key: "todo",
    label: "To Do",
    icon: <BsCircle className="me-1" />,
    color: "outline-secondary",
    bgColor: "bg-light",
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: <BsClockHistory className="me-1" />,
    color: "outline-primary",
    bgColor: "bg-primary bg-opacity-10",
  },
  {
    key: "on_hold",
    label: "On Hold",
    icon: <BsPauseCircle className="me-1" />,
    color: "outline-warning",
    bgColor: "bg-warning bg-opacity-10",
  },
  {
    key: "Completed",
    label: "Completed",
    icon: <BsCheckCircle className="me-1" />,
    color: "outline-success",
    bgColor: "bg-success bg-opacity-10",
  },
];

const PRIORITY = [
  {
    value: 1,
    label: "Critical",
    badge: "danger",
    icon: <BsExclamationOctagon className="me-1" />,
  },
  {
    value: 2,
    label: "High",
    badge: "warning",
    icon: <BsExclamationDiamond className="me-1" />,
  },
  {
    value: 3,
    label: "Medium",
    badge: "primary",
    icon: <BsExclamationTriangle className="me-1" />,
  },
  {
    value: 4,
    label: "Low",
    badge: "secondary",
    icon: <BsExclamationCircle className="me-1" />,
  },
];

const getPriorityMeta = (valOrLabel) => {
  const asNumber = Number(valOrLabel);
  if (!Number.isNaN(asNumber)) {
    return PRIORITY.find((p) => p.value === asNumber) || PRIORITY[2];
  }
  return PRIORITY.find((p) => p.label === valOrLabel) || PRIORITY[2];
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-ZA") : "—");

// ----- Supabase fetchers -----
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

async function fetchProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name")
    .order("name");
  if (error) throw error;
  return data || [];
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

// NEW: Function to notify project manager about employee actions with DEBUG LOGS
const notifyProjectManager = async (taskId, message, type, currentUser) => {
  try {
    console.log("🔔 notifyProjectManager called:", {
      taskId,
      message,
      type,
      currentUser: currentUser?.id,
    });

    if (!currentUser?.id) {
      console.error("❌ No current user found");
      return;
    }

    // Get task details to find project manager
    const { data: task, error } = await supabase
      .from("tasks")
      .select(
        `
        title, project_id,
        project:projects (
          manager_id,
          name
        )
      `
      )
      .eq("id", taskId)
      .single();

    console.log("🔔 Task query result:", { task, error });

    if (error) {
      console.error("❌ Error fetching task:", error);
      return;
    }

    if (!task?.project?.manager_id) {
      console.error("❌ No project manager found for task:", task);
      return;
    }

    // Don't notify if the current user is the manager
    if (task.project.manager_id === currentUser.id) {
      console.log("ℹ️ Skipping notification - user is the project manager");
      return;
    }

    console.log(
      "🔔 Creating notification for manager:",
      task.project.manager_id
    );

    // Create notification for project manager
    const { data: notification, error: notifyError } = await supabase
      .from("notifications")
      .insert({
        type: type,
        user_id: task.project.manager_id,
        actor_id: currentUser.id,
        task_id: taskId,
        project_id: task.project_id,
        message: message,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (notifyError) {
      console.error("❌ Error creating notification:", notifyError);
    } else {
      console.log("✅ Notification created successfully:", notification);
    }
  } catch (err) {
    console.error("🚨 Error in notifyProjectManager:", err);
  }
};

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

    console.log("💬 handleAddComment called:", { taskId });

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
      // NEW: Notify project manager about comment
      await notifyProjectManager(
        taskId,
        `New comment on task by ${currentUser.email}`,
        "task_commented",
        currentUser
      );

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
  }, [taskId]);

  if (loading) return <Spinner animation="border" size="sm" />;

  return (
    <div className="mt-3">
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="d-flex align-items-center mb-2">
        <BsChat className="me-1 text-muted" />
        <h6 className="mb-0 small text-muted">Comments</h6>
      </div>

      <ListGroup
        className="mb-2"
        style={{ maxHeight: "200px", overflowY: "auto" }}
      >
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
            <BsPlusCircle />
          </Button>
        </Form.Group>
      </Form>
    </div>
  );
};

// ----- Component -----
export default function EmployeeTaskView() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState("kanban");
  const [sortBy, setSortBy] = useState("due_date");
  const [activeTab, setActiveTab] = useState("active");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    project_id: "",
    priority: 3,
    due_date: "",
    assignToSelf: true,
  });

  // User
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentUser,
  });

  // Projects
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  // Tasks
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: () => fetchMyTasks(user.id),
    enabled: !!user?.id,
  });

  // Realtime updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`tasks-emp-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => qc.invalidateQueries({ queryKey: ["tasks", user.id] })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_assignments",
          filter: `user_id=eq.${user.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["tasks", user.id] })
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id, qc]);

  // Mutations - FIXED LOGGING
  const createTask = useMutation({
    mutationFn: async (payload) => {
      if (!user?.id) throw new Error("Cannot create task without user ID");
      const { data: task, error } = await supabase
        .from("tasks")
        .insert([payload])
        .select(
          `
          id, title, description, status, priority, due_date, project_id,
          project:projects ( id, name )
        `
        )
        .single();
      if (error) throw error;

      if (payload.assignToSelf && user?.id) {
        const { error: assignErr } = await supabase
          .from("task_assignments")
          .insert([{ task_id: task.id, user_id: user.id }]);
        if (assignErr) throw assignErr;
      }

      // ✅ FIXED: Use object parameter syntax for logActivity
      await logActivity({
        type: "task_created",
        details: `Created task: ${payload.title}`,
        userId: user.id,
        projectId: payload.project_id,
        taskId: task.id,
      });
      return task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", user?.id] });
      setShowCreate(false);
      setNewTask({
        title: "",
        description: "",
        project_id: "",
        priority: 3,
        due_date: "",
        assignToSelf: true,
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, taskTitle, projectId }) => {
      console.log("🔄 updateStatus called:", {
        id,
        status,
        taskTitle,
        projectId,
      });

      if (!user?.id) throw new Error("Cannot update task without user ID");

      // Check if task is currently completed or cancelled
      const { data: currentTask } = await supabase
        .from("tasks")
        .select("status")
        .eq("id", id)
        .single();

      // PREVENT CHANGING STATUS IF TASK IS ALREADY COMPLETED OR CANCELLED
      if (
        currentTask?.status === "Completed" ||
        currentTask?.status === "cancelled"
      ) {
        throw new Error("Cannot change status of completed or cancelled task");
      }

      const { data, error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", id)
        .select(
          `
          id, title, description, status, priority, due_date, project_id,
          project:projects ( id, name )
        `
        )
        .single();
      if (error) throw error;

      // NEW: Notify project manager about status change
      await notifyProjectManager(
        id,
        `Task "${taskTitle}" status changed to ${status} by ${user.email}`,
        "task_status_updated",
        user
      );

      // ✅ FIXED: Use object parameter syntax for logActivity
      await logActivity({
        type: "status_changed",
        details: `Changed task status to: ${status} - ${taskTitle}`,
        userId: user.id,
        projectId: projectId,
        taskId: id,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id) => {
      console.log("🗑️ deleteTask called:", { id });

      if (!user?.id) throw new Error("Cannot delete task without user ID");
      const { data: taskToDelete } = await supabase
        .from("tasks")
        .select("title, project_id")
        .eq("id", id)
        .single();

      // NEW: Notify project manager about task deletion
      await notifyProjectManager(
        id,
        `Task "${taskToDelete?.title}" was deleted by ${user.email}`,
        "task_deleted",
        user
      );

      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;

      if (taskToDelete) {
        // ✅ FIXED: Use object parameter syntax for logActivity
        await logActivity({
          type: "task_deleted",
          details: `Deleted task: ${taskToDelete.title}`,
          userId: user.id,
          projectId: taskToDelete.project_id,
          taskId: id,
        });
      }
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
  });

  // Separate active and cancelled tasks
  const activeTasks = tasks.filter((task) => task.status !== "cancelled");
  const cancelledTasks = tasks.filter((task) => task.status === "cancelled");

  // Derived
  const filtered = useMemo(() => {
    const tasksToFilter = activeTab === "active" ? activeTasks : cancelledTasks;
    const s = search.trim().toLowerCase();
    let filteredTasks = tasksToFilter
      .filter((t) =>
        projectFilter === "all"
          ? true
          : String(t.project_id) === String(projectFilter)
      )
      .filter((t) =>
        s
          ? (t.title || "").toLowerCase().includes(s) ||
            (t.description || "").toLowerCase().includes(s) ||
            (t.project?.name || "").toLowerCase().includes(s)
          : true
      );

    // Sort tasks
    filteredTasks.sort((a, b) => {
      if (sortBy === "due_date") {
        return new Date(a.due_date || 0) - new Date(b.due_date || 0);
      } else if (sortBy === "priority") {
        return a.priority - b.priority;
      } else if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });

    return filteredTasks;
  }, [activeTasks, cancelledTasks, activeTab, search, projectFilter, sortBy]);

  const byStatus = useMemo(() => {
    if (activeTab === "cancelled") {
      return { cancelled: filtered };
    }

    const map = { todo: [], in_progress: [], on_hold: [], Completed: [] };
    for (const t of filtered) {
      const key = STATUS.some((s) => s.key === t.status) ? t.status : "todo";
      map[key].push(t);
    }
    return map;
  }, [filtered, activeTab]);

  // Counts for active tasks only
  const activeCounts = {
    todo: activeTasks.filter((t) => t.status === "todo").length,
    in_progress: activeTasks.filter((t) => t.status === "in_progress").length,
    on_hold: activeTasks.filter((t) => t.status === "on_hold").length,
    Completed: activeTasks.filter((t) => t.status === "Completed").length,
    total: activeTasks.length,
  };

  // UI components
  const StatusBadge = ({ status }) => {
    const meta = STATUS.find((s) => s.key === status) || {
      key: "todo",
      label: "To Do",
      icon: <BsCircle className="me-1" />,
      color: "outline-secondary",
    };
    return (
      <Badge
        pill
        bg="light"
        text="dark"
        className="fw-normal d-flex align-items-center border"
      >
        {meta.icon}
        {meta.label}
      </Badge>
    );
  };

  const PriorityBadge = ({ priority }) => {
    const meta = getPriorityMeta(priority);
    return (
      <Badge
        pill
        bg={meta.badge}
        className="text-uppercase fw-normal d-flex align-items-center"
      >
        {meta.icon}
        {meta.label}
      </Badge>
    );
  };

  const TaskCard = ({ task }) => (
    <Card className="border-0 shadow-sm mb-3 task-card hover-shadow">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="mb-0 task-title text-truncate me-2">{task.title}</h6>
          {/* HIDE DROPDOWN FOR COMPLETED AND CANCELLED TASKS */}
          {task.status !== "Completed" && task.status !== "cancelled" && (
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="light"
                size="sm"
                className="p-1 border-0"
              >
                <BsThreeDotsVertical />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item
                  onClick={() =>
                    updateStatus.mutate({
                      id: task.id,
                      status: "todo",
                      taskTitle: task.title,
                      projectId: task.project_id,
                    })
                  }
                >
                  <BsCircle className="me-2" /> Mark To Do
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() =>
                    updateStatus.mutate({
                      id: task.id,
                      status: "in_progress",
                      taskTitle: task.title,
                      projectId: task.project_id,
                    })
                  }
                >
                  <BsClockHistory className="me-2" /> Mark In Progress
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() =>
                    updateStatus.mutate({
                      id: task.id,
                      status: "on_hold",
                      taskTitle: task.title,
                      projectId: task.project_id,
                    })
                  }
                >
                  <BsPauseCircle className="me-2" /> Mark On Hold
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() =>
                    updateStatus.mutate({
                      id: task.id,
                      status: "Completed",
                      taskTitle: task.title,
                      projectId: task.project_id,
                    })
                  }
                >
                  <BsCheckCircle className="me-2" /> Mark Completed
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item
                  className="text-danger"
                  onClick={() => deleteTask.mutate(task.id)}
                >
                  <BsTrash className="me-2" /> Delete
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
          {/* SHOW LOCKED BADGE FOR COMPLETED TASKS */}
          {task.status === "Completed" && (
            <Badge bg="success" className="d-flex align-items-center">
              <BsCheckCircle className="me-1" />
              Completed
            </Badge>
          )}
          {/* SHOW LOCKED BADGE FOR CANCELLED TASKS */}
          {task.status === "cancelled" && (
            <Badge bg="secondary" className="d-flex align-items-center">
              <BsXCircle className="me-1" />
              Cancelled
            </Badge>
          )}
        </div>

        <div className="d-flex align-items-center text-muted small mb-2">
          <BsFolder className="me-1" />
          <span className="me-2 text-truncate">
            {task.project?.name || "—"}
          </span>
          <BsCalendar className="me-1" />
          <span>Due: {fmtDate(task.due_date)}</span>
        </div>

        {task.description && (
          <p
            className="mb-2 text-muted task-description"
            style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}
          >
            {task.description.length > 120
              ? `${task.description.substring(0, 120)}...`
              : task.description}
          </p>
        )}

        <div className="d-flex justify-content-between align-items-center mb-2">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>

        {/* --- COMMENTS --- */}
        {user && <TaskComments taskId={task.id} currentUser={user} />}
      </Card.Body>
    </Card>
  );

  const TaskListItem = ({ task }) => (
    <div className="border-bottom pb-3 mb-3">
      <div className="d-flex justify-content-between align-items-start">
        <div className="flex-grow-1">
          <div className="d-flex align-items-center mb-1">
            <h6 className="mb-0 me-2">{task.title}</h6>
            <PriorityBadge priority={task.priority} />
            {/* SHOW LOCKED BADGE FOR COMPLETED TASKS */}
            {task.status === "Completed" && (
              <Badge bg="success" className="ms-2 d-flex align-items-center">
                <BsCheckCircle className="me-1" />
                Locked
              </Badge>
            )}
            {/* SHOW LOCKED BADGE FOR CANCELLED TASKS */}
            {task.status === "cancelled" && (
              <Badge bg="secondary" className="ms-2 d-flex align-items-center">
                <BsXCircle className="me-1" />
                Locked
              </Badge>
            )}
          </div>

          <div className="d-flex align-items-center text-muted small mb-1">
            <BsFolder className="me-1" />
            <span className="me-2">{task.project?.name || "—"}</span>
            <BsCalendar className="me-1" />
            <span>Due: {fmtDate(task.due_date)}</span>
          </div>

          {task.description && (
            <p
              className="mb-2 text-muted"
              style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}
            >
              {task.description}
            </p>
          )}

          <div className="d-flex gap-2 align-items-center">
            <StatusBadge status={task.status} />
            {/* HIDE UPDATE BUTTON FOR COMPLETED AND CANCELLED TASKS */}
            {task.status !== "Completed" && task.status !== "cancelled" && (
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => {
                  const statusOrder = [
                    "todo",
                    "in_progress",
                    "on_hold",
                    "Completed",
                  ];
                  const currentIndex = statusOrder.indexOf(task.status);
                  const nextStatus =
                    statusOrder[(currentIndex + 1) % statusOrder.length];

                  updateStatus.mutate({
                    id: task.id,
                    status: nextStatus,
                    taskTitle: task.title,
                    projectId: task.project_id,
                  });
                }}
              >
                <BsArrowRepeat className="me-1" />
                Update Status
              </Button>
            )}

            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => deleteTask.mutate(task.id)}
            >
              <BsTrash />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loadingUser || loadingTasks || loadingProjects) {
    return (
      <Container
        fluid
        className="d-flex justify-content-center align-items-center"
        style={{ height: "50vh" }}
      >
        <div className="text-center">
          <Spinner animation="border" role="status" className="mb-3" />
          <p>Loading your tasks...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 bg-light" style={{ minHeight: "100vh" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0 fw-bold">My Tasks</h2>
          <p className="text-muted mb-0">
            Manage your assigned tasks and projects
          </p>
        </div>
        {/* REMOVED: Create Task Button */}
      </div>

      {/* Tabs for Active vs Cancelled Tasks */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="p-0">
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Card.Header className="bg-white border-bottom-0">
              <Nav variant="tabs" className="border-bottom-0">
                <Nav.Item>
                  <Nav.Link eventKey="active" className="border-0">
                    <BsListTask className="me-2" />
                    Active Tasks ({activeTasks.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="cancelled" className="border-0">
                    <BsArchive className="me-2" />
                    Cancelled Tasks ({cancelledTasks.length})
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>

            <Tab.Content>
              <Tab.Pane eventKey="active">
                <Card.Body className="p-4">
                  {/* Stats Overview - ACTIVE TASKS ONLY */}
                  <Row className="mb-4">
                    <Col md={3} className="mb-3">
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Body className="p-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="card-title text-muted mb-1">
                                To Do
                              </h6>
                              <h3 className="fw-bold mb-0">
                                {activeCounts.todo}
                              </h3>
                            </div>
                            <div className="bg-primary bg-opacity-10 p-3 rounded">
                              <BsCircle className="text-primary" size={24} />
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3} className="mb-3">
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Body className="p-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="card-title text-muted mb-1">
                                In Progress
                              </h6>
                              <h3 className="fw-bold mb-0">
                                {activeCounts.in_progress}
                              </h3>
                            </div>
                            <div className="bg-info bg-opacity-10 p-3 rounded">
                              <BsClockHistory className="text-info" size={24} />
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3} className="mb-3">
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Body className="p-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="card-title text-muted mb-1">
                                On Hold
                              </h6>
                              <h3 className="fw-bold mb-0">
                                {activeCounts.on_hold}
                              </h3>
                            </div>
                            <div className="bg-warning bg-opacity-10 p-3 rounded">
                              <BsPauseCircle
                                className="text-warning"
                                size={24}
                              />
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3} className="mb-3">
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Body className="p-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="card-title text-muted mb-1">
                                Completed
                              </h6>
                              <h3 className="fw-bold mb-0">
                                {activeCounts.Completed}
                              </h3>
                            </div>
                            <div className="bg-success bg-opacity-10 p-3 rounded">
                              <BsCheckCircle
                                className="text-success"
                                size={24}
                              />
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Filters for Active Tasks */}
                  <Row className="g-3 mb-4">
                    <Col md={4}>
                      <div className="position-relative">
                        <BsSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                        <Form.Control
                          placeholder="Search tasks..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="ps-5 rounded-pill"
                        />
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="position-relative">
                        <BsFilter className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                        <Form.Select
                          value={projectFilter}
                          onChange={(e) => setProjectFilter(e.target.value)}
                          className="ps-5 rounded-pill"
                        >
                          <option value="all">All Projects</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Form.Select>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="position-relative">
                        <BsSortDown className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                        <Form.Select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="ps-5 rounded-pill"
                        >
                          <option value="due_date">Due Date</option>
                          <option value="priority">Priority</option>
                          <option value="title">Title</option>
                        </Form.Select>
                      </div>
                    </Col>
                    <Col md={2}>
                      <div className="btn-group w-100">
                        <Button
                          variant={
                            viewMode === "kanban"
                              ? "primary"
                              : "outline-primary"
                          }
                          size="sm"
                          onClick={() => setViewMode("kanban")}
                          className="rounded-pill d-flex align-items-center"
                        >
                          <BsColumnsGap className="me-1" /> Board
                        </Button>
                        <Button
                          variant={
                            viewMode === "list" ? "primary" : "outline-primary"
                          }
                          size="sm"
                          onClick={() => setViewMode("list")}
                          className="rounded-pill d-flex align-items-center"
                        >
                          <BsListTask className="me-1" /> List
                        </Button>
                      </div>
                    </Col>
                  </Row>

                  {/* Active Tasks View */}
                  {viewMode === "kanban" ? (
                    <Row>
                      {STATUS.map((s) => (
                        <Col key={s.key} lg={3} md={6} className="mb-4">
                          <Card className="h-100 status-column border-0 shadow-sm">
                            <Card.Header
                              className={`${s.bgColor} d-flex justify-content-between align-items-center py-3`}
                            >
                              <h6 className="mb-0 d-flex align-items-center">
                                {s.icon}
                                {s.label}{" "}
                                <Badge bg="light" text="dark" className="ms-2">
                                  {byStatus[s.key]?.length || 0}
                                </Badge>
                              </h6>
                            </Card.Header>
                            <Card.Body
                              className="p-3"
                              style={{
                                minHeight: "500px",
                                maxHeight: "70vh",
                                overflowY: "auto",
                              }}
                            >
                              {(byStatus[s.key] || []).map((t) => (
                                <TaskCard key={t.id} task={t} />
                              ))}
                              {(byStatus[s.key] || []).length === 0 && (
                                <div className="text-center text-muted py-4">
                                  <div className="mb-2 opacity-50">
                                    {s.key === "todo" ? (
                                      <BsCircle size={32} />
                                    ) : s.key === "in_progress" ? (
                                      <BsClockHistory size={32} />
                                    ) : s.key === "on_hold" ? (
                                      <BsPauseCircle size={32} />
                                    ) : (
                                      <BsCheckCircle size={32} />
                                    )}
                                  </div>
                                  <p className="mb-0 small">
                                    No {s.label.toLowerCase()} tasks
                                  </p>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
                        <h6 className="mb-0">
                          Active Tasks ({filtered.length})
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        {filtered.map((t) => (
                          <TaskListItem key={t.id} task={t} />
                        ))}
                        {filtered.length === 0 && (
                          <div className="text-center text-muted py-5">
                            <BsListTask size={32} className="mb-3 opacity-50" />
                            <h5>No active tasks found</h5>
                            <p>
                              Try changing your filters or create a new task
                            </p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  )}
                </Card.Body>
              </Tab.Pane>

              <Tab.Pane eventKey="cancelled">
                <Card.Body className="p-4">
                  {/* Cancelled Tasks View */}
                  <Row className="g-3 mb-4">
                    <Col md={6}>
                      <div className="position-relative">
                        <BsSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                        <Form.Control
                          placeholder="Search cancelled tasks..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="ps-5 rounded-pill"
                        />
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="position-relative">
                        <BsFilter className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                        <Form.Select
                          value={projectFilter}
                          onChange={(e) => setProjectFilter(e.target.value)}
                          className="ps-5 rounded-pill"
                        >
                          <option value="all">All Projects</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Form.Select>
                      </div>
                    </Col>
                  </Row>

                  <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-secondary text-white d-flex justify-content-between align-items-center py-3">
                      <h6 className="mb-0 d-flex align-items-center">
                        <BsArchive className="me-2" />
                        Cancelled Tasks ({filtered.length})
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      {filtered.map((t) => (
                        <TaskListItem key={t.id} task={t} />
                      ))}
                      {filtered.length === 0 && (
                        <div className="text-center text-muted py-5">
                          <BsArchive size={32} className="mb-3 opacity-50" />
                          <h5>No cancelled tasks found</h5>
                          <p>Cancelled tasks will appear here</p>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Card.Body>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>
    </Container>
  );
}
