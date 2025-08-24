import React, { useState, useEffect } from "react";
import { 
  Button, 
  Card, 
  Table, 
  Form, 
  Badge,
  Container,
  Row,
  Col,
  Spinner
} from "react-bootstrap";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import { PersonPlus, Gear, List } from "react-bootstrap-icons";

const UserManagement = () => {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      window.location.href = "/api/login";
    }
  }, [user, authLoading]);

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    },
    enabled: !!user && user.role === "admin",
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      alert("User role updated successfully");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
      } else {
        alert("Failed to update user role");
      }
    },
  });

  const handleRoleChange = (userId, newRole) => {
    if (userId === user?.id) {
      alert("You cannot change your own role");
      return;
    }
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  if (authLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null; // Redirect will happen from useEffect
  }

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-grow-1">
        {/* Header */}
        <header className="bg-white shadow-sm border-bottom py-3">
          <Container fluid>
            <Row className="align-items-center">
              <Col className="d-flex align-items-center">
                <Button
                  variant="outline-secondary"
                  className="d-lg-none me-3"
                  onClick={() => setSidebarOpen(true)}
                >
                  <List />
                </Button>
                <div>
                  <h1 className="h4 mb-0">User Management</h1>
                  <p className="text-muted mb-0 small">Manage team members and their roles</p>
                </div>
              </Col>
              <Col className="d-flex justify-content-end">
                <Button variant="primary">
                  <PersonPlus className="me-2" />
                  <span className="d-none d-sm-inline">Add User</span>
                </Button>
              </Col>
            </Row>
          </Container>
        </header>

        {/* Main Content */}
        <Container fluid className="py-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <Card.Title className="mb-0">Team Members</Card.Title>
            </Card.Header>
            <Card.Body className="p-0">
              {usersLoading ? (
                <div className="text-center p-5">
                  <Spinner animation="border" />
                </div>
              ) : users?.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((teamUser) => (
                        <tr key={teamUser.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="bg-primary rounded-circle text-white d-flex align-items-center justify-content-center me-3" 
                                   style={{ width: '36px', height: '36px' }}>
                                {teamUser.firstName?.[0]}{teamUser.lastName?.[0]}
                              </div>
                              <div>
                                <div className="fw-medium">
                                  {teamUser.firstName} {teamUser.lastName}
                                </div>
                                <div className="text-muted small">
                                  {teamUser.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <Form.Select
                              value={teamUser.role}
                              onChange={(e) => handleRoleChange(teamUser.id, e.target.value)}
                              disabled={teamUser.id === user.id || updateRoleMutation.isLoading}
                              size="sm"
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="employee">Employee</option>
                              <option value="executive">Executive</option>
                            </Form.Select>
                          </td>
                          <td>
                            <Badge pill bg="success">
                              Active
                            </Badge>
                          </td>
                          <td className="text-muted">
                            {teamUser.createdAt ? new Date(teamUser.createdAt).toLocaleDateString() : "Unknown"}
                          </td>
                          <td className="text-end">
                            <Button variant="light" size="sm">
                              <Gear size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center p-5 text-muted">
                  No users found
                </div>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
};

export default UserManagement;