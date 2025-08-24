import React, { useState, useEffect } from "react";
import { Card, Button, Form, Alert, Badge, Row, Col } from "react-bootstrap";
import { supabase } from "../lib/supabaseClient";

const TeamManagement = ({ teamId, isTeamManager, onTeamUpdated }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [nonMembers, setNonMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({
    user_id: "",
    role_in_team: "",
  });

  useEffect(() => {
    if (teamId) {
      fetchTeamMembers();
    }
  }, [teamId]);

  useEffect(() => {
    if (teamMembers.length > 0) {
      fetchNonMembers();
    }
  }, [teamMembers]);

  const fetchTeamMembers = async () => {
    try {
      // First try to use the view
      let { data, error } = await supabase
        .from("team_members_with_details")
        .select("*")
        .eq("team_id", teamId)
        .order("added_at", { ascending: false });

      // If the view doesn't exist or fails, fall back to the direct table
      if (error) {
        console.log("View not available, falling back to direct table query");
        ({ data, error } = await supabase
          .from("team_members")
          .select(
            `
            *,
            user:profiles (id, first_name, last_name, email)
          `
          )
          .eq("team_id", teamId)
          .order("added_at", { ascending: false }));
      }

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      setError("Error loading team members: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNonMembers = async () => {
    try {
      // Get all users not currently in this team
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .not(
          "id",
          "in",
          `(${
            teamMembers.map((member) => `'${member.user_id}'`).join(",") ||
            "NULL"
          })`
        )
        .order("first_name", { ascending: true });

      if (error) throw error;
      setNonMembers(data || []);
    } catch (error) {
      console.error("Error loading non-members:", error.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const { error } = await supabase.from("team_members").insert({
        team_id: teamId,
        user_id: newMember.user_id,
        role_in_team: newMember.role_in_team,
        added_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Reset form and refresh data
      setNewMember({ user_id: "", role_in_team: "" });
      setShowAddForm(false);

      // Refresh the team members list
      await fetchTeamMembers();

      // Notify parent component that team was updated
      if (onTeamUpdated) onTeamUpdated();
    } catch (error) {
      setError("Error adding team member: " + error.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this team member?"))
      return;

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      // Refresh the team members list
      await fetchTeamMembers();

      // Notify parent component that team was updated
      if (onTeamUpdated) onTeamUpdated();
    } catch (error) {
      setError("Error removing team member: " + error.message);
    }
  };

  // Helper function to safely display user names
  const getUserDisplayName = (member) => {
    if (member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    }
    if (member.user?.first_name && member.user?.last_name) {
      return `${member.user.first_name} ${member.user.last_name}`;
    }
    return "Unknown User";
  };

  // Helper function to safely display user email
  const getUserEmail = (member) => {
    return member.email || member.user?.email || "Email not available";
  };

  if (loading) {
    return <div className="text-center my-4">Loading team members...</div>;
  }

  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Team Management</h5>
          {isTeamManager && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "Cancel" : "+ Add Member"}
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {showAddForm && isTeamManager && (
          <Form onSubmit={handleAddMember} className="mb-4 p-3 border rounded">
            <h6>Add New Team Member</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Select User</Form.Label>
                  <Form.Select
                    value={newMember.user_id}
                    onChange={(e) =>
                      setNewMember({ ...newMember, user_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Select a user</option>
                    {nonMembers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Role in Team</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMember.role_in_team}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        role_in_team: e.target.value,
                      })
                    }
                    placeholder="Enter role"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button variant="primary" type="submit">
                  Add
                </Button>
              </Col>
            </Row>
          </Form>
        )}

        <h6>Current Team Members</h6>
        {teamMembers.length > 0 ? (
          <div className="team-members-list">
            {teamMembers.map((member) => (
              <Card key={member.id} className="mb-2">
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-0">{getUserDisplayName(member)}</h6>
                      <small className="text-muted">
                        {getUserEmail(member)}
                      </small>
                      {member.role_in_team && (
                        <div>
                          <Badge bg="secondary" className="mt-1">
                            {member.role_in_team}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {isTeamManager && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted">No team members yet.</p>
        )}
      </Card.Body>
    </Card>
  );
};

export default TeamManagement;
