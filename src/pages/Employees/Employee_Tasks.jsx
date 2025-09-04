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
} from "react-icons/bs";

// ----- Helpers & Mappings -----
const STATUS = [
  {
    key: "todo",
    label: "To Do",
    icon: <BsCircle className="me-1" />,
    color: "secondary",
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: <BsClockHistory className="me-1" />,
    color: "primary",
  },
  {
    key: "Completed",
    label: "Completed",
    icon: <BsCheckCircle className="me-1" />,
    color: "success",
  },
];

const PRIORITY = [
  {
    value: 1,
    label: "critical",
    badge: "danger",
    icon: <BsExclamationOctagon className="me-1" />,
  },
  {
    value: 2,
    label: "high",
    badge: "warning",
    icon: <BsExclamationDiamond className="me-1" />,
  },
  {
    value: 3,
    label: "medium",
    badge: "primary",
    icon: <BsExclamationTriangle className="me-1" />,
  },
  {
    value: 4,
    label: "low",
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
        <BsChat className="me-1" />
        <h6 className="mb-0">Comments</h6>
      </div>

      <ListGroup
        className="mb-2"
        style={{ maxHeight: "200px", overflowY: "auto" }}
      >
        {comments.length === 0 && (
          <ListGroup.Item className="text-muted text-center py-3">
            No comments yet
          </ListGroup.Item>
        )}
        {comments.map((c) => (
          <ListGroup.Item key={c.comment_id} className="py-2">
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
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' or 'list'
  const [sortBy, setSortBy] = useState("due_date");
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

  // Mutations
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

      await logActivity(
        "task_created",
        `Created task: ${payload.title}`,
        user.id,
        payload.project_id
      );
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
      if (!user?.id) throw new Error("Cannot update task without user ID");
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

      await logActivity(
        "status_changed",
        `Changed task status to: ${status} - ${taskTitle}`,
        user.id,
        projectId
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id) => {
      if (!user?.id) throw new Error("Cannot delete task without user ID");
      const { data: taskToDelete } = await supabase
        .from("tasks")
        .select("title, project_id")
        .eq("id", id)
        .single();

      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;

      if (taskToDelete) {
        await logActivity(
          "task_deleted",
          `Deleted task: ${taskToDelete.title}`,
          user.id,
          taskToDelete.project_id
        );
      }
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
  });

  // Derived
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let filteredTasks = tasks
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
  }, [tasks, search, projectFilter, sortBy]);

  const byStatus = useMemo(() => {
    const map = { todo: [], in_progress: [], Completed: [] };
    for (const t of filtered) {
      const key = STATUS.some((s) => s.key === t.status) ? t.status : "todo";
      map[key].push(t);
    }
    return map;
  }, [filtered]);

  const counts = {
    todo: byStatus.todo.length,
    in_progress: byStatus.in_progress.length,
    Completed: byStatus.Completed.length,
    total: filtered.length,
  };

  // UI components
  const StatusBadge = ({ status }) => {
    const meta = STATUS.find((s) => s.key === status) || {
      key: "todo",
      label: "To Do",
      icon: <BsCircle className="me-1" />,
      color: "secondary",
    };
    return (
      <Badge
        pill
        bg={meta.color}
        className="fw-normal d-flex align-items-center"
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
    <Card className="border-0 shadow-sm mb-3 task-card">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div className="me-3 flex-grow-1">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h6 className="mb-0 task-title">{task.title}</h6>
              <Dropdown align="end">
                <Dropdown.Toggle variant="light" size="sm" className="p-1">
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
            </div>

            <div className="d-flex align-items-center text-muted small mb-2">
              <BsFolder className="me-1" />
              <span className="me-2">{task.project?.name || "—"}</span>
              <BsCalendar className="me-1" />
              <span>Due: {fmtDate(task.due_date)}</span>
            </div>

            {task.description && (
              <p
                className="mb-2 text-muted task-description"
                style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}
              >
                {task.description}
              </p>
            )}

            <div className="d-flex gap-2 align-items-center mb-2">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
            </div>

            {/* --- COMMENTS --- */}
            {user && <TaskComments taskId={task.id} currentUser={user} />}
          </div>
        </div>
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
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => {
                const nextStatus =
                  task.status === "todo"
                    ? "in_progress"
                    : task.status === "in_progress"
                    ? "Completed"
                    : "todo";

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
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">My Tasks</h2>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={5}>
              <div className="position-relative">
                <BsSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <Form.Control
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-5"
                />
              </div>
            </Col>
            <Col md={3}>
              <div className="position-relative">
                <BsFilter className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <Form.Select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
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
            </Col>
            <Col md={2}>
              <div className="position-relative">
                <BsSortDown className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <Form.Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="ps-5"
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
                    viewMode === "kanban" ? "primary" : "outline-primary"
                  }
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                >
                  <BsKanban className="me-1" /> Board
                </Button>
                <Button
                  variant={viewMode === "list" ? "primary" : "outline-primary"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <BsListTask className="me-1" /> List
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {viewMode === "kanban" ? (
        <Row>
          {STATUS.map((s) => (
            <Col key={s.key} lg={4} md={6} className="mb-4">
              <Card className="h-100 status-column">
                <Card.Header
                  className={`bg-${s.color} bg-opacity-10 d-flex justify-content-between align-items-center`}
                >
                  <h6 className="mb-0 d-flex align-items-center">
                    {s.icon}
                    {s.label}{" "}
                    <Badge bg="light" text={s.color} className="ms-2">
                      {byStatus[s.key].length}
                    </Badge>
                  </h6>
                </Card.Header>
                <Card.Body
                  className="p-3"
                  style={{
                    minHeight: "400px",
                    maxHeight: "70vh",
                    overflowY: "auto",
                  }}
                >
                  {byStatus[s.key].map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                  {byStatus[s.key].length === 0 && (
                    <div className="text-center text-muted py-4">
                      <div className="mb-2">
                        {s.key === "todo" ? (
                          <BsCircle size={24} />
                        ) : s.key === "in_progress" ? (
                          <BsClockHistory size={24} />
                        ) : (
                          <BsCheckCircle size={24} />
                        )}
                      </div>
                      <p className="mb-0">No {s.label.toLowerCase()} tasks</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">All Tasks ({filtered.length})</h6>
          </Card.Header>
          <Card.Body>
            {filtered.map((t) => (
              <TaskListItem key={t.id} task={t} />
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-muted py-5">
                <BsListTask size={32} className="mb-3" />
                <h5>No tasks found</h5>
                <p>Try changing your filters or create a new task</p>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      <Modal show={showCreate} onHide={() => setShowCreate(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            <BsPlusCircle className="me-2" /> Create New Task
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Title *</Form.Label>
                  <Form.Control
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    placeholder="What needs to be done?"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value })
                    }
                  >
                    {PRIORITY.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.icon} {p.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                placeholder="Add details about this task..."
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Project</Form.Label>
                  <Form.Select
                    value={newTask.project_id}
                    onChange={(e) =>
                      setNewTask({ ...newTask, project_id: e.target.value })
                    }
                  >
                    <option value="">Select project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) =>
                      setNewTask({ ...newTask, due_date: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label={
                  <span className="d-flex align-items-center">
                    <BsPersonPlus className="me-2" /> Assign to me
                  </span>
                }
                checked={newTask.assignToSelf}
                onChange={(e) =>
                  setNewTask({ ...newTask, assignToSelf: e.target.checked })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowCreate(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => createTask.mutate(newTask)}
            disabled={creating || !newTask.title.trim()}
            className="d-flex align-items-center"
          >
            {creating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />{" "}
                Creating...
              </>
            ) : (
              <>
                <BsPlusCircle className="me-2" /> Create Task
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
