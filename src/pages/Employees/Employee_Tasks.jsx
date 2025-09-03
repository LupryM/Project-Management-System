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
} from "react-bootstrap";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { logActivity } from "../../lib/logger";

// ----- Helpers & Mappings -----
const STATUS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "Completed", label: "Completed" },
];

const PRIORITY = [
  { value: 1, label: "critical", badge: "danger" },
  { value: 2, label: "high", badge: "warning" },
  { value: 3, label: "medium", badge: "primary" },
  { value: 4, label: "low", badge: "secondary" },
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
    <div className="mt-2">
      {error && <Alert variant="danger">{error}</Alert>}
      <ListGroup className="mb-2">
        {comments.length === 0 && (
          <ListGroup.Item>No comments yet</ListGroup.Item>
        )}
        {comments.map((c) => (
          <ListGroup.Item key={c.comment_id}>
            <strong>{c.profiles?.first_name || "User"}:</strong>{" "}
            {c.comment_text}{" "}
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

// ----- Component -----
export default function EmployeeTaskView() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
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
    return tasks
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
  }, [tasks, search, projectFilter]);

  const byStatus = useMemo(() => {
    const map = { todo: [], in_progress: [], Completed: [] };
    for (const t of filtered) {
      const key = STATUS.some((s) => s.key === t.status) ? t.status : "todo";
      map[key].push(t);
    }
    for (const k of Object.keys(map))
      map[k].sort(
        (a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0)
      );
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
    };
    const variant =
      meta.key === "Completed"
        ? "success"
        : meta.key === "in_progress"
        ? "primary"
        : "secondary";
    return (
      <Badge pill bg={variant} className="fw-normal">
        {meta.label}
      </Badge>
    );
  };

  const PriorityBadge = ({ priority }) => {
    const meta = getPriorityMeta(priority);
    return (
      <Badge pill bg={meta.badge} className="text-uppercase fw-normal">
        {meta.label}
      </Badge>
    );
  };

  const TaskCard = ({ task }) => (
    <Card className="border-0 shadow-sm mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div className="me-3">
            <h5 className="mb-1">{task.title}</h5>
            <div className="text-muted small mb-2">
              <i className="bi bi-folder me-1" />
              {task.project?.name || "—"}
              <span className="mx-2">•</span>
              <i className="bi bi-calendar me-1" />
              Due: {fmtDate(task.due_date)}
            </div>
            {task.description && (
              <p className="mb-2 text-muted" style={{ whiteSpace: "pre-wrap" }}>
                {task.description}
              </p>
            )}
            <div className="d-flex gap-2 align-items-center">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
            </div>

            {/* --- COMMENTS --- */}
            {user && <TaskComments taskId={task.id} currentUser={user} />}
          </div>

          <Dropdown align="end">
            <Dropdown.Toggle variant="secondary" size="sm">
              ⋮
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
                Mark To Do
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
                Mark In Progress
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
                Mark Completed
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item
                className="text-danger"
                onClick={() => deleteTask.mutate(task.id)}
              >
                Delete
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Card.Body>
    </Card>
  );

  if (loadingUser || loadingTasks || loadingProjects)
    return <Spinner animation="border" />;

  return (
    <Container fluid>
      <Row className="mb-3">
        <Col md={6}>
          <Form.Control
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2} className="text-end">
          <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
        </Col>
      </Row>

      <Row>
        {STATUS.map((s) => (
          <Col key={s.key} md={4}>
            <h6>
              {s.label} ({byStatus[s.key].length})
            </h6>
            {byStatus[s.key].map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </Col>
        ))}
      </Row>

      <Modal show={showCreate} onHide={() => setShowCreate(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
              />
            </Form.Group>

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
                    {p.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

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

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Assign to me"
                checked={newTask.assignToSelf}
                onChange={(e) =>
                  setNewTask({ ...newTask, assignToSelf: e.target.checked })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => createTask.mutate(newTask)}
            disabled={creating}
          >
            Create Task
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
