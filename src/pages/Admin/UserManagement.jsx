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
      const { data: { user } } = await supabase.auth.getUser();
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

  // Fetch users
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
      console.error("Error fetching users:", error.message);
      setError("Failed to load users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch activity logs
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
      console.error("Error fetching activity logs:", error.message);
      setError("Failed to load activity logs: " + error.message);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Handle role update
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

      setUsers(users.map((user) =>
        user.id === selectedUser.id ? { ...user, role: updatedRole } : user
      ));
      setSuccess("User role updated successfully");
      setShowEditModal(false);
      setSelectedUser(null);
      setUpdatedRole("");
      fetchActivityLogs();
    } catch (error) {
      console.error("Error updating user role:", error.message);
      setError("Failed to update user role: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Handle deactivate/activate
  const toggleUserStatus = async (user) => {
    if (!currentUser) return;
    const newStatus = user.status === "Active" ? "Inactive" : "Active";
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);
      if (error) throw error;

      await logActivity({
        type: "user_status_changed",
        details: `${user.email} status changed to ${newStatus}`,
        projectId: null,
        userId: currentUser.id,
      });

      setUsers(users.map((u) =>
        u.id === user.id ? { ...u, status: newStatus } : u
      ));
      setSuccess(`User ${newStatus.toLowerCase()} successfully`);
      fetchActivityLogs();
    } catch (error) {
      console.error("Error updating user status:", error.message);
      setError("Failed to update status: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setUpdatedRole(user.role);
    setShowEditModal(true);
    setError("");
    setSuccess("");
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
                        className={user.status === "Inactive" ? "text-muted" : ""}
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
                          {new Date(user.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => openEditModal(user)}
                            disabled={
                              currentUser && user.id === currentUser.id || user.status === "Inactive"
                            }
                          >
                            Edit Role
                          </Button>
                          <Button
                            variant={user.status === "Active" ? "danger" : "success"}
                            size="sm"
                            onClick={() => toggleUserStatus(user)}
                            disabled={currentUser && user.id === currentUser.id}
                          >
                            {user.status === "Active" ? "Deactivate" : "Activate"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="activity" title="Activity Log" onEnter={fetchActivityLogs}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent User Activity</h5>
              <Button variant="outline-primary" size="sm" onClick={fetchActivityLogs}>
                Refresh Logs
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              {logsLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status" className="me-2" />
                  Loading activity logs...
                </div>
              ) : (
                <Table responsive hover>
                  <thead className="bg-light">
                    <tr>
                      <th>User</th>
                      <th>Activity Type</th>
                      <th>Details</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4">
                          No activity logs found
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            {log.profiles ? (
                              <div>
                                <div className="fw-semibold">
                                  {log.profiles.first_name} {log.profiles.last_name}
                                </div>
                                <div className="text-muted small">{log.profiles.email}</div>
                              </div>
                            ) : (
                              "Unknown user"
                            )}
                          </td>
                          <td>{getActivityBadge(log.activity_type)}</td>
                          <td>{log.activity_details}</td>
                          <td>
                            {new Date(log.created_at).toLocaleString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

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
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleRoleUpdate} disabled={updating}>
            {updating ? "Updating..." : "Update Role"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UserManagement;
