import React, { useState } from "react";
import { Form, Button, Row, Col, Card, Alert } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { logActivity } from "../../lib/logger"; // ✅ Import logger

// NOTE: Will use project prop if provided; otherwise it'll fetch dates inline.
const TaskForm = ({ projectId, teamMembers, onTaskCreated, project }) => {
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "3",
    start_date: "",
    due_date: "",
  });
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTaskForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAssigneeChange = (userId) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter((id) => id !== userId));
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No authenticated user found");

      // 🔒 Project/task date validation using STRING compares (YYYY-MM-DD)
      // 1) Get project start/due dates (from prop if present; otherwise fetch).
      let projectStartStr = project?.start_date ?? null;
      let projectDueStr = project?.due_date ?? null;

      if (!projectStartStr && !projectDueStr) {
        const { data: projRow, error: projErr } = await supabase
          .from("projects")
          .select("start_date, due_date")
          .eq("id", projectId)
          .single();
        if (projErr) throw projErr;
        projectStartStr = projRow?.start_date ?? null;
        projectDueStr = projRow?.due_date ?? null;
      }

      // Normalize to YYYY-MM-DD (strip time if any)
      const normalize = (d) =>
        typeof d === "string" ? d.split("T")[0] : d ?? null;

      projectStartStr = normalize(projectStartStr);
      projectDueStr = normalize(projectDueStr);

      const taskStartStr = normalize(taskForm.start_date);
      const taskDueStr = normalize(taskForm.due_date);

      // 2) Validate ranges (string comparison is safe for ISO dates)
      if (taskStartStr && taskDueStr && taskStartStr > taskDueStr) {
        throw new Error("Task start date cannot be later than task due date.");
      }
      if (projectStartStr && taskStartStr && taskStartStr < projectStartStr) {
        throw new Error("Task start date cannot be before project start date.");
      }
      if (projectDueStr && taskDueStr && taskDueStr > projectDueStr) {
        throw new Error("Task due date cannot be after project due date.");
      }

      // ▶ Create the task
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: taskForm.title,
          description: taskForm.description,
          status: taskForm.status,
          priority: taskForm.priority,
          start_date: taskForm.start_date || null,
          due_date: taskForm.due_date || null,
          project_id: projectId,
          created_by: user.id,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // ✅ Check any selected assignee has < 3 active tasks
      for (const userId of selectedAssignees) {
        const { count: activeTasksCount, error: countError } = await supabase
          .from("task_assignments")
          .select("task_id", { count: "exact", head: true })
          .eq("user_id", userId)
          .in(
            "task_id",
            (
              await supabase
                .from("tasks")
                .select("id")
                .in("status", ["todo", "in_progress"])
            ).data.map((t) => t.id)
          );

        if (countError) throw countError;

        if (activeTasksCount >= 3) {
          throw new Error(
            `User "${
              teamMembers.find((m) => m.user_id === userId)?.first_name ||
              "Unknown"
            }" already has 3 or more active tasks.`
          );
        }
      }

      // ▶ Create assignments
      if (selectedAssignees.length > 0) {
        const assignments = selectedAssignees.map((userId) => ({
          task_id: taskData.id,
          user_id: userId,
        }));

        const { error: assignmentError } = await supabase
          .from("task_assignments")
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }

      // ▶ Log activity
      await logActivity({
        projectId,
        type: "task_created",
        details: `Task "${taskData.title}" was created.`,
      });

      // ▶ Reset
      setTaskForm({
        title: "",
        description: "",
        status: "todo",
        priority: "3",
        start_date: "",
        due_date: "",
      });
      setSelectedAssignees([]);
      setSuccess(true);

      if (onTaskCreated) onTaskCreated();
    } catch (err) {
      console.error("Error creating task:", err?.message || err);
      // Friendlier message for date violations
      if (
        String(err?.message || "")
          .toLowerCase()
          .includes("date") ||
        String(err?.message || "").includes("task_dates")
      ) {
        setError("Task dates must be within the project timeline.");
      } else {
        setError("Error creating task: " + (err?.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  // Optional min/max constraints for the pickers (only if project provided)
  const inputMin = project?.start_date
    ? project.start_date.split("T")[0]
    : undefined;
  const inputMax = project?.due_date
    ? project.due_date.split("T")[0]
    : undefined;

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">Create New Task</h5>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            variant="success"
            onClose={() => setSuccess(false)}
            dismissible
          >
            Task created successfully!
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Task Title *</Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={taskForm.title}
                  onChange={handleInputChange}
                  placeholder="Enter task title"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Priority</Form.Label>
                <Form.Select
                  name="priority"
                  value={taskForm.priority}
                  onChange={handleInputChange}
                >
                  <option value="1">High</option>
                  <option value="2">Medium</option>
                  <option value="3">Low</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={taskForm.description}
              onChange={handleInputChange}
              placeholder="Enter task description"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Assign To (Multiple Selection)</Form.Label>
            <div
              className="border rounded p-3"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <Form.Check
                    key={member.user_id}
                    type="checkbox"
                    id={`assignee-${member.user_id}`}
                    label={`${member.first_name} ${member.last_name}`}
                    checked={selectedAssignees.includes(member.user_id)}
                    onChange={() => handleAssigneeChange(member.user_id)}
                    className="mb-2"
                  />
                ))
              ) : (
                <p className="text-muted">No team members available</p>
              )}
            </div>
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="start_date"
                  value={taskForm.start_date}
                  onChange={handleInputChange}
                  min={inputMin}
                  max={inputMax}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Due Date</Form.Label>
                <Form.Control
                  type="date"
                  name="due_date"
                  value={taskForm.due_date}
                  onChange={handleInputChange}
                  min={inputMin}
                  max={inputMax}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select
              name="status"
              value={taskForm.status}
              onChange={handleInputChange}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </Form.Select>
          </Form.Group>

          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Creating Task..." : "Create Task"}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default TaskForm;
