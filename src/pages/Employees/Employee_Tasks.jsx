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
} from "react-bootstrap";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

// ----- Helpers & Mappings -----
const STATUS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "Completed", label: "Completed" }, // <-- updated capitalization
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
    status: t.status || "todo", // normalized
    priority: Number(t.priority) || 3,
  }));
}

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
  const {
    data: user,
    isLoading: loadingUser,
    isError: userErr,
    error: userError,
  } = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentUser,
  });

  // Projects
  const {
    data: projects,
    isLoading: loadingProjects,
    isError: projErr,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  // Tasks
  const {
    data: tasks = [],
    isLoading: loadingTasks,
    isError: tasksErr,
    error: tasksError,
  } = useQuery({
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  // Mutations
  const createTask = useMutation({
    mutationFn: async (payload) => {
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

      if (newTask.assignToSelf && user?.id) {
        const { error: assignErr } = await supabase
          .from("task_assignments")
          .insert([{ task_id: task.id, user_id: user.id }]);
        if (assignErr) throw assignErr;
      }

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
    mutationFn: async ({ id, status }) => {
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
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", user?.id] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
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
    const map = { todo: [], in_progress: [], Completed: [] }; // <-- updated key
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
    Completed: byStatus.Completed.length, // <-- updated
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
          </div>

          <Dropdown align="end">
            <Dropdown.Toggle
              size="sm"
              variant="outline-light"
              className="border"
            >
              Actions
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>Move to</Dropdown.Header>
              {STATUS.map((s) => (
                <Dropdown.Item
                  key={s.key}
                  active={task.status === s.key}
                  onClick={() =>
                    updateStatus.mutate({ id: task.id, status: s.key })
                  }
                >
                  {s.label}
                </Dropdown.Item>
              ))}
              <Dropdown.Divider />
              <Dropdown.Item
                className="text-danger"
                onClick={() =>
                  window.confirm("Delete this task?") &&
                  deleteTask.mutate(task.id)
                }
              >
                Delete
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Card.Body>
    </Card>
  );

  const CreateTaskModal = () => (
    <Modal show={showCreate} onHide={() => setShowCreate(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Create Task</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newTask.title.trim()) return;
            setCreating(true);
            try {
              await createTask.mutateAsync({
                title: newTask.title.trim(),
                description: newTask.description.trim(),
                project_id: newTask.project_id
                  ? Number(newTask.project_id)
                  : null,
                priority: Number(newTask.priority) || 3,
                status: "todo",
                created_by: user?.id ?? null,
                start_date: new Date().toISOString().split("T")[0],
                due_date: newTask.due_date || null,
              });
            } catch (err) {
              alert(
                err?.message ||
                  "Could not create task (RLS may block non-managers)."
              );
            } finally {
              setCreating(false);
            }
          }}
        >
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              value={newTask.title}
              onChange={(e) =>
                setNewTask((s) => ({ ...s, title: e.target.value }))
              }
              placeholder="e.g., Fix login bug"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={newTask.description}
              onChange={(e) =>
                setNewTask((s) => ({ ...s, description: e.target.value }))
              }
              placeholder="Optional details"
            />
          </Form.Group>

          <Row className="g-3">
            <Col md={7}>
              <Form.Group>
                <Form.Label>Project</Form.Label>
                <Form.Select
                  value={newTask.project_id}
                  onChange={(e) =>
                    setNewTask((s) => ({ ...s, project_id: e.target.value }))
                  }
                >
                  <option value="">Select a project...</option>
                  {(projects || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={5}>
              <Form.Group>
                <Form.Label>Due date</Form.Label>
                <Form.Control
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) =>
                    setNewTask((s) => ({ ...s, due_date: e.target.value }))
                  }
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mt-1">
            <Col md={7}>
              <Form.Group>
                <Form.Label>Priority</Form.Label>
                <Form.Select
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask((s) => ({
                      ...s,
                      priority: Number(e.target.value),
                    }))
                  }
                >
                  {PRIORITY.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={5} className="d-flex align-items-end">
              <Form.Check
                type="checkbox"
                label="Assign to me"
                checked={newTask.assignToSelf}
                onChange={(e) =>
                  setNewTask((s) => ({ ...s, assignToSelf: e.target.checked }))
                }
              />
            </Col>
          </Row>

          <div className="d-flex justify-content-end mt-4">
            <Button
              variant="secondary"
              className="me-2"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );

  // Loading/Error
  if (loadingUser || loadingProjects || (loadingTasks && user?.id)) {
    return (
      <div className="d-flex align-items-center justify-content-center p-5">
        <Spinner animation="border" className="me-3" />
        <span>Loading your tasks…</span>
      </div>
    );
  }
  if (userErr)
    return (
      <div className="p-4 text-danger">Auth error: {userError?.message}</div>
    );
  if (tasksErr)
    return (
      <div className="p-4 text-danger">Task error: {tasksError?.message}</div>
    );

  // Main UI
  return (
    <Container fluid className="p-4">
      {/* Top bar */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center mb-2">
            <h1 className="mb-0 me-3">My Tasks</h1>
            <Badge bg="light" text="dark" className="fs-6 fw-normal">
              {counts.total} total
            </Badge>
          </div>
          <div className="text-muted">
            Track and update your assigned work across projects
          </div>
        </Col>
        <Col xs="12" md="auto" className="mt-3 mt-md-0">
          <div className="d-flex gap-2">
            <Form.Select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              style={{ minWidth: 220 }}
            >
              <option value="all">All projects</option>
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Form.Select>
            <Form.Control
              placeholder="Search title, description, project…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <Button onClick={() => setShowCreate(true)}>New Task</Button>
          </div>
        </Col>
      </Row>

      {/* Counters */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between bg-light p-3 rounded">
            <div className="text-center">
              <div className="text-muted small">TO DO</div>
              <div className="fs-4 fw-bold text-dark">{counts.todo}</div>
            </div>
            <div className="text-center">
              <div className="text-muted small">IN PROGRESS</div>
              <div className="fs-4 fw-bold text-primary">
                {counts.in_progress}
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted small">COMPLETED</div>
              <div className="fs-4 fw-bold text-success">
                {counts.Completed}
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted small">TOTAL</div>
              <div className="fs-4 fw-bold text-dark">{counts.total}</div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Kanban */}
      <Row>
        {STATUS.map((col) => (
          <Col md={4} key={col.key} className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="mb-0">{col.label}</h5>
              <Badge bg="secondary">{byStatus[col.key]?.length || 0}</Badge>
            </div>

            {byStatus[col.key]?.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}

            {byStatus[col.key]?.length === 0 && (
              <Card className="border-0 shadow-sm">
                <Card.Body className="text-muted text-center py-4">
                  No tasks here
                </Card.Body>
              </Card>
            )}
          </Col>
        ))}
      </Row>

      <CreateTaskModal />
    </Container>
  );
}
