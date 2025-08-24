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
  Spinner,
  Alert
} from "react-bootstrap";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PersonPlus, Gear, List } from "react-bootstrap-icons";

// Mock implementations (replace with your actual implementations)
const useAuth = () => ({
  user: { id: "1", role: "admin" },
  isLoading: false
});

const apiRequest = async (method, endpoint) => {
  if (endpoint === "/api/users") {
    return {
      json: async () => ([
        { id: "1", firstName: "Admin", lastName: "User", email: "admin@example.com", role: "admin", createdAt: new Date() },
        { id: "2", firstName: "Manager", lastName: "User", email: "manager@example.com", role: "manager", createdAt: new Date() }
      ])
    };
  }
  return { json: async () => ({}) };
};

const Sidebar = ({ isOpen, onClose }) => (
  <div className={`sidebar ${isOpen ? 'open' : ''}`}>
    <Button onClick={onClose}>Close</Button>
  </div>
);

const UserManagement = () => {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      console.log("Redirect to login");
    }
  }, [user, authLoading]);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    },
    enabled: !!user && user.role === "admin",
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/role`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  const handleRoleChange = (userId, newRole) => {
    if (userId === user?.id) {
      setError("You cannot change your own role");
      return;
    }
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  if (authLoading) {
    return <div className="text-center p-5"><Spinner animation="border" /></div>;
  }

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-grow-1">
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
                <h1 className="h4 mb-0">User Management</h1>
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

        <Container fluid className="py-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <Card.Title>Team Members</Card.Title>
            </Card.Header>
            <Card.Body>
              {usersLoading ? (
                <Spinner animation="border" />
              ) : users?.length > 0 ? (
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>{user.firstName} {user.lastName}</td>
                        <td>
                          <Form.Select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                          </Form.Select>
                        </td>
                        <td><Badge bg="success">Active</Badge></td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div>No users found</div>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
};

export default UserManagement;