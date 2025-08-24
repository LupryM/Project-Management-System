import React, { useState, useEffect } from "react";
import { Form, Button, Row, Col, Card, Alert } from "react-bootstrap";
import { supabase } from "../lib/supabaseClient";

const TaskForm = ({ projectId, teamMembers, onTaskCreated }) => {
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
    setTaskForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssigneeChange = (userId) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter(id => id !== userId));
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
      // First, create the task
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
          created_by: (await supabase.auth.getUser()).data.user.id,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Then create assignments for each selected user
      if (selectedAssignees.length > 0) {
        const assignments = selectedAssignees.map(userId => ({
          task_id: taskData.id,
          user_id: userId,
        }));

        const { error: assignmentError } = await supabase
          .from("task_assignments")
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }

      // Reset form and show success
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
      
      // Notify parent component
      if (onTaskCreated) onTaskCreated();
      
    } catch (error) {
      console.error("Error creating task:", error.message);
      setError("Error creating task: " + error.message);
    } finally {
      setLoading(false);
    }
  };

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
          <Alert variant="success" onClose={() => setSuccess(false)} dismissible>
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
            <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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

          <Button 
            variant="primary" 
            type="submit" 
            disabled={loading}
          >
            {loading ? "Creating Task..." : "Create Task"}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default TaskForm;