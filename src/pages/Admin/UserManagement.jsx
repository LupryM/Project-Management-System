import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Badge,
  InputGroup,
  Alert,
  Spinner,
  Tabs,
  Tab,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { logActivity } from "../../lib/logger";

// Team Management Component
const TeamManagement = ({ currentUser }) => {
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [updatedRole, setUpdatedRole] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const rolesInTeam = ["editor", "read-only"];

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true);
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      setError("Failed to load teams: " + err.message);
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchTeamMembers = async (teamId) => {
    try {
      setLoadingTeams(true);
      const { data, error } = await supabase
        .from("team_members")
        .select(`*, profiles:user_id (first_name, last_name, email)`)
        .eq("team_id", teamId);
      if (error) throw error;
      setTeamMembers(
        (data || []).filter((member) =>
          rolesInTeam.includes(member.role_in_team)
        )
      );
    } catch (err) {
      setError("Failed to load team members: " + err.message);
    } finally {
      setLoadingTeams(false);
    }
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setUpdatedRole(member.role_in_team || "read-only");
    setError("");
    setSuccess("");
  };

  const handleRoleUpdate = async () => {
    if (!editingMember || !updatedRole) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role_in_team: updatedRole })
        .eq("team_id", editingMember.team_id)
        .eq("user_id", editingMember.user_id);
      if (error) throw error;

      await logActivity({
        type: "team_role_changed",
        details: `Changed role in team ${editingMember.team_id} from ${editingMember.role_in_team} to ${updatedRole} for ${editingMember.profiles.email}`,
        projectId: null,
        userId: currentUser.id,
      });

      setTeamMembers((prev) =>
        prev.map((m) =>
          m.team_id === editingMember.team_id &&
          m.user_id === editingMember.user_id
            ? { ...m, role_in_team: updatedRole }
            : m
        )
      );
      setSuccess("Team member role updated successfully");
      setEditingMember(null);
      setUpdatedRole("");
    } catch (err) {
      setError("Failed to update role: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loadingTeams) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" className="me-2" />
        Loading teams...
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Select Team</Form.Label>
          <Form.Select
            value={selectedTeam || ""}
            onChange={(e) => {
              const teamId = parseInt(e.target.value);
              setSelectedTeam(teamId);
              fetchTeamMembers(teamId);
            }}
          >
            <option value="">Select a team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {selectedTeam && (
          <Table responsive hover>
            <thead className="bg-light">
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role in Team</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4">
                    No team members found
                  </td>
                </tr>
              ) : (
                teamMembers.map((member) => (
                  <tr key={member.user_id}>
                    <td>
                      {member.profiles?.first_name} {member.profiles?.last_name}
                    </td>
                    <td>{member.profiles?.email}</td>
                    <td>{member.role_in_team || "N/A"}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => openEditModal(member)}
                      >
                        Edit Role
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        <Modal show={!!editingMember} onHide={() => setEditingMember(null)}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Team Member Role</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editingMember && (
              <>
                <p>
                  Editing role for:{" "}
                  <strong>{editingMember.profiles.email}</strong>
                </p>
                <Form.Group className="mb-3">
                  <Form.Label>Select Role</Form.Label>
                  <Form.Select
                    value={updatedRole}
                    onChange={(e) => setUpdatedRole(e.target.value)}
                  >
                    {rolesInTeam.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRoleUpdate}
              disabled={updating}
            >
              {updating ? "Updating..." : "Update Role"}
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
};

// Main UserManagement Component
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [updatedRole, setUpdatedRole] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const roles = ["admin", "executive", "manager", "employee"];

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setCurrentUser({ ...user, role: profile?.role });
      }
    };
    getCurrentUser();
  }, []);

  // Fetch all users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      setError("Failed to load users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setLogsLoading(true);
      const { data, error } = await supabase
        .from("project_logs")
        .select(`*, profiles:user_id (first_name, last_name, email)`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      setError("Failed to load activity logs: " + error.message);
    } finally {
      setLogsLoading(false);
    }
  };

  // Filter users
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }
    const filtered = users.filter(
      (u) =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.first_name &&
          u.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.last_name &&
          u.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const openEditModal = (user) => {
    setSelectedUser(user);
    setUpdatedRole(user.role);
    setShowEditModal(true);
    setError("");
    setSuccess("");
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser || !updatedRole || !currentUser) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: updatedRole })
        .eq("id", selectedUser.id);
      if (error) throw error;

      await logActivity({
        type: "role_changed",
        details: `Changed user role from ${selectedUser.role} to ${updatedRole} for ${selectedUser.email}`,
        projectId: null,
        userId: currentUser.id,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, role: updatedRole } : u
        )
      );
      setSuccess("User role updated successfully");
      setShowEditModal(false);
      setSelectedUser(null);
      setUpdatedRole("");
      fetchActivityLogs();
    } catch (error) {
      setError("Failed to update user role: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const toggleUserStatus = async (user) => {
    if (!currentUser) return;
    const newStatus = user.status === "Active" ? "Inactive" : "Active";
    setUpdating(true);

    try {
      // Update user status
      const { error: statusError } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);
      if (statusError) throw statusError;

      // If deactivating, handle task assignments AND remove from teams
      if (newStatus === "Inactive") {
        // Get active tasks assigned to this user with proper join
        const { data: activeTasks, error: tasksError } = await supabase
          .from("task_assignments")
          .select(
            `
          *,
          tasks!inner(
            id,
            title,
            status,
            created_by
          )
        `
          )
          .eq("user_id", user.id)
          .in("tasks.status", ["todo", "in_progress"]);

        if (tasksError) throw tasksError;

        // Unassign tasks
        for (const assignment of activeTasks || []) {
          await supabase
            .from("task_assignments")
            .delete()
            .eq("id", assignment.id);

          // Now assignment.tasks should always exist due to !inner join
          await supabase.from("notifications").insert({
            user_id: assignment.tasks.created_by,
            actor_id: currentUser.id,
            task_id: assignment.task_id,
            type: "task_reassignment_needed",
            message: `User ${user.email} was deactivated. Task "${assignment.tasks.title}" needs reassignment.`,
          });
        }

        // NEW: Remove user from all teams
        const { error: teamRemoveError } = await supabase
          .from("team_members")
          .delete()
          .eq("user_id", user.id);

        if (teamRemoveError) {
          console.error("Error removing user from teams:", teamRemoveError);
          // Don't throw here, just log the error but continue
        }
      }

      // Log activity
      await logActivity({
        type: "user_status_changed",
        details: `${user.email} status changed to ${newStatus}${
          newStatus === "Inactive" ? " and removed from all teams" : ""
        }`,
        projectId: null,
        userId: currentUser.id,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );

      setSuccess(
        `User ${
          newStatus === "Active" ? "activated" : "deactivated"
        } successfully${
          newStatus === "Inactive" ? " and removed from all teams" : ""
        }`
      );
    } catch (error) {
      console.error("Error updating user status:", error.message);
      setError("Failed to update status: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadge = (role) => {
    const variants = {
      admin: "danger",
      executive: "info",
      manager: "warning",
      employee: "success",
    };
    return (
      <Badge pill bg={variants[role] || "secondary"} className="text-uppercase">
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (status) => (
    <Badge pill bg={status === "Active" ? "success" : "secondary"}>
      {status}
    </Badge>
  );

  const getActivityBadge = (type) => {
    const variants = {
      role_changed: "warning",
      user_created: "success",
      user_updated: "info",
      user_deleted: "danger",
      user_status_changed: "secondary",
      project_created: "success",
      project_updated: "info",
      project_deleted: "danger",
      team_role_changed: "info",
    };
    return (
      <Badge bg={variants[type] || "secondary"} className="text-capitalize">
        {type.replace(/_/g, " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Container fluid className="p-4">
        <div className="text-center">
          <Spinner animation="border" role="status" className="me-2" />
          Loading users...
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <h1 className="mb-0">User Management</h1>
          <p className="text-muted">Manage system users and their roles</p>
        </Col>
        <Col xs="auto" className="d-flex align-items-center">
          <Button variant="outline-primary" onClick={fetchUsers}>
            Refresh
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Tabs defaultActiveKey="users" className="mb-3">
        <Tab eventKey="users" title="Users">
          <Card className="mb-4 shadow-sm border-0">
            <Card.Body>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <Table responsive hover>
                <thead className="bg-light">
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={
                          user.status === "Inactive" ? "text-muted" : ""
                        }
                      >
                        <td>
                          <div className="d-flex align-items-center">
                            <div
                              className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3"
                              style={{ width: "40px", height: "40px" }}
                            >
                              <span className="text-white fw-bold">
                                {user.first_name
                                  ? user.first_name[0].toUpperCase()
                                  : user.email
                                  ? user.email[0].toUpperCase()
                                  : "U"}
                              </span>
                            </div>
                            <div>
                              <div className="fw-semibold">
                                {user.first_name && user.last_name
                                  ? `${user.first_name} ${user.last_name}`
                                  : "No name"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>{getRoleBadge(user.role)}</td>
                        <td>{getStatusBadge(user.status)}</td>
                        <td>
                          {new Date(user.created_at).toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "short", day: "numeric" }
                          )}
                        </td>
                        <td className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => openEditModal(user)}
                          >
                            Edit Role
                          </Button>
                          <Button
                            variant={
                              user.status === "Active"
                                ? "outline-danger"
                                : "outline-success"
                            }
                            size="sm"
                            onClick={() => toggleUserStatus(user)}
                          >
                            {user.status === "Active"
                              ? "Deactivate"
                              : "Activate"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Edit User Role</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedUser && (
                <>
                  <p>
                    Editing role for: <strong>{selectedUser.email}</strong>
                  </p>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Role</Form.Label>
                    <Form.Select
                      value={updatedRole}
                      onChange={(e) => setUpdatedRole(e.target.value)}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRoleUpdate}
                disabled={updating}
              >
                {updating ? "Updating..." : "Update Role"}
              </Button>
            </Modal.Footer>
          </Modal>
        </Tab>

        <Tab eventKey="teams" title="Teams">
          <TeamManagement currentUser={currentUser} />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default UserManagement;
