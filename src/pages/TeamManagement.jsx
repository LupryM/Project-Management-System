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
    role_in_team: "Read-Only", 
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Get current user for notifications
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();

    if (teamId) {
      fetchTeamMembers();
    }
  }, [teamId]);

  useEffect(() => {
    if (teamMembers.length >= 0) {
      fetchNonMembers();
    }
  }, [teamMembers]);

  // NEW: Function to send notifications to team members
  const notifyTeamMembers = async (action, targetUserName, targetUserEmail, role = null) => {
    try {
      if (!currentUser || !teamId) return;

      // Get all team members (excluding the target user if it's a removal)
      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (error || !teamMembers || teamMembers.length === 0) return;

      // Create notification message based on action
      let message = "";
      let type = "";

      switch (action) {
        case "member_added":
          message = `${targetUserName} (${targetUserEmail}) has been added to the team${role ? ` as ${role}` : ''}`;
          type = "team_member_added";
          break;
        case "member_removed":
          message = `${targetUserName} (${targetUserEmail}) has been removed from the team`;
          type = "team_member_removed";
          break;
        case "role_changed":
          message = `${targetUserName}'s role has been changed to ${role}`;
          type = "team_role_changed";
          break;
        default:
          return;
      }

      // Create notifications for all team members
      const notifications = teamMembers.map(member => ({
        type: type,
        user_id: member.user_id,
        actor_id: currentUser.id,
        team_id: teamId,
        message: message,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      // Insert all notifications
      const { error: notifyError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifyError) {
        console.error("Failed to create team notifications:", notifyError);
      }

    } catch (err) {
      console.error("Error in notifyTeamMembers:", err);
    }
  };

  // NEW: Function to send notification to the specific user being added/removed
  const notifyTargetUser = async (action, teamName, targetUserId, role = null) => {
    try {
      if (!currentUser || !targetUserId) return;

      let message = "";
      let type = "";

      switch (action) {
        case "member_added":
          message = `You have been added to team "${teamName}"${role ? ` as ${role}` : ''}`;
          type = "team_member_added";
          break;
        case "member_removed":
          message = `You have been removed from team "${teamName}"`;
          type = "team_member_removed";
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from("notifications")
        .insert({
          type: type,
          user_id: targetUserId,
          actor_id: currentUser.id,
          team_id: teamId,
          message: message,
          is_read: false,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Failed to create user notification:", error);
      }

    } catch (err) {
      console.error("Error in notifyTargetUser:", err);
    }
  };

  // NEW: Function to get team name for notifications
  const getTeamName = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("name")
        .eq("id", teamId)
        .single();

      if (error) throw error;
      return data?.name || "the team";
    } catch (err) {
      console.error("Error fetching team name:", err);
      return "the team";
    }
  };

  const fetchTeamMembers = async () => {
    try {
      // First try to use the view
      let { data, error } = await supabase
        .from("team_members_with_details")
        .select("*")
        .eq("team_id", teamId)
        .order("added_at", { ascending: false });

      // If the view doesn't exist or fails, fall back to the direct table query
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

      // Transform the data to handle both flat and nested structures
      const transformedData = (data || []).map((member) => ({
        ...member,
        user_id: member.user_id || member.user?.id,
        first_name: member.first_name || member.user?.first_name,
        last_name: member.last_name || member.user?.last_name,
        email: member.email || member.user?.email,
      }));

      setTeamMembers(transformedData);
    } catch (error) {
      setError("Error loading team members: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNonMembers = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .order("first_name", { ascending: true });

      if (teamMembers.length > 0) {
        const memberIds = teamMembers.map((member) => member.user_id);
        query = query.not("id", "in", `(${memberIds.join(",")})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNonMembers(data || []);
    } catch (error) {
      console.error("Error loading non-members:", error.message);
      setNonMembers([]);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Get the user being added for notifications
      const userToAdd = nonMembers.find(user => user.id === newMember.user_id);
      if (!userToAdd) throw new Error("Selected user not found");

      const { error } = await supabase.from("team_members").insert({
        team_id: teamId,
        user_id: newMember.user_id,
        role_in_team: newMember.role_in_team,
        added_at: new Date().toISOString(),
      });

      if (error) throw error;

      // NEW: Send notifications
      const teamName = await getTeamName();
      
      // Notify all team members about the new addition
      await notifyTeamMembers(
        "member_added",
        `${userToAdd.first_name} ${userToAdd.last_name}`,
        userToAdd.email,
        newMember.role_in_team
      );

      // Notify the user who was added
      await notifyTargetUser("member_added", teamName, newMember.user_id, newMember.role_in_team);

      // Reset form and refresh data
      setNewMember({ user_id: "", role_in_team: "Read-Only" });
      setShowAddForm(false);

      // Refresh the team members list
      await fetchTeamMembers();

      // Notify parent component that team was updated
      if (onTeamUpdated) onTeamUpdated();
    } catch (error) {
      setError("Error adding team member: " + error.message);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm("Are you sure you want to remove this team member?"))
      return;

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", member.user_id);

      if (error) throw error;

      // NEW: Send notifications
      const teamName = await getTeamName();
      
      // Notify all team members about the removal
      await notifyTeamMembers(
        "member_removed",
        `${member.first_name} ${member.last_name}`,
        member.email
      );

      // Notify the user who was removed
      await notifyTargetUser("member_removed", teamName, member.user_id);

      // Refresh the team members list
      await fetchTeamMembers();

      // Notify parent component that team was updated
      if (onTeamUpdated) onTeamUpdated();
    } catch (error) {
      setError("Error removing team member: " + error.message);
    }
  };

  // NEW: Handle role changes with notifications
  const handleRoleChange = async (member, newRole) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role_in_team: newRole })
        .eq("team_id", teamId)
        .eq("user_id", member.user_id);

      if (error) throw error;

      // NEW: Send notification about role change
      await notifyTeamMembers(
        "role_changed",
        `${member.first_name} ${member.last_name}`,
        member.email,
        newRole
      );

      // Refresh the team members list
      await fetchTeamMembers();

      // Notify parent component that team was updated
      if (onTeamUpdated) onTeamUpdated();
    } catch (error) {
      setError("Error updating team member role: " + error.message);
    }
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
                  <Form.Select
                    value={newMember.role_in_team}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        role_in_team: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="Read-Only">Read-Only</option>
                    <option value="Editor">Editor</option>
                  </Form.Select>
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
                      <h6 className="mb-0">
                        {member.first_name} {member.last_name}
                      </h6>
                      <small className="text-muted">{member.email}</small>
                      {member.role_in_team && (
                        <div className="mt-1">
                          {isTeamManager ? (
                            <Form.Select
                              size="sm"
                              style={{ width: 'auto', display: 'inline-block' }}
                              value={member.role_in_team}
                              onChange={(e) => handleRoleChange(member, e.target.value)}
                            >
                              <option value="Read-Only">Read-Only</option>
                              <option value="Editor">Editor</option>
                            </Form.Select>
                          ) : (
                            <Badge bg="secondary">
                              {member.role_in_team}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {isTeamManager && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveMember(member)}
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