import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Form, Button, ListGroup, Spinner, Alert } from "react-bootstrap";

const TaskComments = ({ taskId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch comments for this task
  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_comments")
      .select(`
        comment_id,
        comment_text,
        created_at,
        profiles:first_name,last_name
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

  // Add a new comment
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
      fetchComments(); // refresh the list
    }
  };

  useEffect(() => {
    fetchComments();

    // Optional: Realtime subscription
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

  if (loading) return <Spinner animation="border" />;

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}

      <ListGroup className="mb-3">
        {comments.length === 0 && <div>No comments yet</div>}
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
        <Form.Group controlId="newComment">
          <Form.Control
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
        </Form.Group>
        <Button className="mt-2" type="submit">
          Add Comment
        </Button>
      </Form>
    </div>
  );
};

export default TaskComments;
