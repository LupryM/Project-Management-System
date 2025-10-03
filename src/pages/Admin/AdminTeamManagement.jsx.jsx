import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Form,
  Badge,
  Spinner,
  Modal,
  InputGroup,
  Alert,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";

const TeamManagement = ({ teamId }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("read-only");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [updating, setUpdating] = useState(false);

  const permissions = ["editor", "read-only"];

  // Fetch users
  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load users: " + err.message);
    }
  };

  // Fetch team members, filter out any manager rows
  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("team_members")
        .select(`*, profiles:user_id (first_name, last_name, email, role)`)
        .eq("team_id", teamId);

      if (error) throw error;

      // Filter out managers
      const filtered = (data || []).filter((member) =>
        permissions.includes(member.permission)
      );

      setTeamMembers(filtered);
    } catch (err) {
      console.error(err);
      setError("Failed to load team members: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
    fetchTeamMembers();
  }, [teamId]);

  // Add user
  const handleAddUser = async () => {
    if (!selectedUserId) return;
    setAddingUser(true);
    setError("");
    setSuccess("");
    try {
      const exists = teamMembers.find((m) => m.user_id === selectedUserId);
      if (exists) {
        setError("User is already in this team.");
        return;
      }

      const { data, error } = await supabase.from("team_members").insert({
        team_id: teamId,
        user_id: selectedUserId,
        permission: selectedPermission,
      });

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No data returned");

      setSuccess("User added successfully");
      setSelectedUserId("");
      setSelectedPermission("read-only");
      fetchTeamMembers();
    } catch (err) {
      console.error(err);
      setError("Failed to add user: " + err.message);
    } finally {
      setAddingUser(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (member) => {
    if (!window.confirm("Are you sure?")) return;
    setError("");
    setSuccess("");
    try {
      const { data, error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", member.user_id);

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No data returned");

      setSuccess("User removed successfully");
      fetchTeamMembers();
    } catch (err) {
      console.error(err);
      setError("Failed to remove user: " + err.message);
    }
  };

  // Edit permission modal
  const openPermissionModal = (member) => {
    setCurrentMember(member);
    setSelectedPermission(member.permission);
    setShowPermissionModal(true);
    setError("");
    setSuccess("");
  };

  // Update permission
  const handleUpdatePermission = async () => {
    if (!currentMember) return;
    setUpdating(true);
    setError("");
    setSuccess("");
    try {
      const { data, error } = await supabase
        .from("team_members")
        .update({ permission: selectedPermission })
        .eq("team_id", teamId)
        .eq("user_id", currentMember.user_id);

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No data returned");

      setSuccess("Permission updated successfully");
      setShowPermissionModal(false);
      setCurrentMember(null);
      fetchTeamMembers();
    } catch (err) {
      console.error(err);
      setError("Failed to update permission: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getPermissionBadge = (p) => {
    const variants = { editor: "primary", "read-only": "secondary" };
    return (
      <Badge pill bg={variants[p] || "secondary"}>
        {p}
      </Badge>
    );
  };

  if (loading)
    return (
      <div className="text-center py-4">
        <Spinner animation="border" /> Loading team members...
      </div>
    );

  return (
    <div>
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess("")} dismissible>
          {success}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Header>
          <h5>Add User to Team</h5>
        </Card.Header>
        <Card.Body>
          <InputGroup>
            <Form.Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select a user...</option>
              {allUsers
                .filter((u) => !teamMembers.find((m) => m.user_id === u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.email})
                  </option>
                ))}
            </Form.Select>
            <Form.Select
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value)}
            >
              {permissions.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </Form.Select>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? "Adding..." : "Add"}
            </Button>
          </InputGroup>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <h5>Team Members</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover>
            <thead className="bg-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Permission</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    No team members
                  </td>
                </tr>
              ) : (
                teamMembers.map((m) => (
                  <tr key={m.user_id}>
                    <td>
                      {m.profiles
                        ? `${m.profiles.first_name} ${m.profiles.last_name}`
                        : "Unknown"}
                    </td>
                    <td>{m.profiles?.email || "Unknown"}</td>
                    <td>{m.profiles?.role || "Unknown"}</td>
                    <td>{getPermissionBadge(m.permission)}</td>
                    <td className="d-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => openPermissionModal(m)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRemoveMember(m)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal
        show={showPermissionModal}
        onHide={() => setShowPermissionModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Permission</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Select
            value={selectedPermission}
            onChange={(e) => setSelectedPermission(e.target.value)}
          >
            {permissions.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </Form.Select>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowPermissionModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdatePermission}
            disabled={updating}
          >
            {updating ? "Updating..." : "Update"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TeamManagement;
