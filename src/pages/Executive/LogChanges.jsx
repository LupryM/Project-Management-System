import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  InputGroup,
  Badge,
  Spinner,
  Alert,
  Modal,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";

const LogChanges = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [users, setUsers] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [error, setError] = useState("");

  const activityTypes = [
    "role_changed",
    "user_created",
    "user_updated",
    "user_deleted",
    "project_created",
    "project_updated",
    "project_deleted",
    "task_created",
    "task_updated",
    "task_deleted",
    "task_assigned",
    "file_uploaded",
    "comment_added",
  ];

  // Fetch activity logs with user information
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");

      // Use the same approach as UserManagement - query admin_profiles view
      const { data: logsData, error: logsError } = await supabase
        .from("project_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (logsError) {
        console.error("Error fetching logs:", logsError);
        setError("Failed to load activity logs: " + logsError.message);
        return;
      }

      // Get user details using the same method as UserManagement
      const { data: usersData, error: usersError } = await supabase
        .from("admin_profiles")
        .select("id, first_name, last_name, email");

      if (usersError) {
        console.error("Error fetching users:", usersError);
        setError("Failed to load user information: " + usersError.message);
        return;
      }

      // Create a map for quick user lookup
      const userMap = {};
      usersData.forEach((user) => {
        userMap[user.id] = user;
      });

      // Enrich logs with user information
      const enrichedLogs = logsData.map((log) => ({
        ...log,
        // Use the admin_profiles data which should have the same structure as UserManagement
        profiles: userMap[log.user_id] || {
          first_name: "Unknown",
          last_name: "User",
          email: "unknown@example.com",
        },
      }));

      setLogs(enrichedLogs);
      setFilteredLogs(enrichedLogs);
    } catch (error) {
      console.error("Error in fetchLogs:", error);
      setError("Failed to load activity logs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for filter using admin_profiles (same as UserManagement)
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_profiles")
        .select("id, first_name, last_name, email")
        .order("first_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  // Filter logs based on search term and type
  useEffect(() => {
    let filtered = logs;

    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (log) =>
          log.activity_details
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (log.profiles &&
            (log.profiles.first_name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
              log.profiles.last_name
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              log.profiles.email
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase())))
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((log) => log.activity_type === filterType);
    }

    if (filterUser !== "all") {
      filtered = filtered.filter((log) => log.user_id === filterUser);
    }

    setFilteredLogs(filtered);
  }, [searchTerm, filterType, filterUser, logs]);

  const getActivityBadge = (type) => {
    const variants = {
      role_changed: "warning",
      user_created: "success",
      user_updated: "info",
      user_deleted: "danger",
      project_created: "success",
      project_updated: "info",
      project_deleted: "danger",
      task_created: "success",
      task_updated: "info",
      task_deleted: "danger",
      task_assigned: "primary",
      file_uploaded: "secondary",
      comment_added: "info",
    };

    const readableType = type.replace(/_/g, " ");

    return (
      <Badge bg={variants[type] || "secondary"} className="text-capitalize">
        {readableType}
      </Badge>
    );
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <Container fluid className="p-4">
        <div className="text-center">
          <Spinner animation="border" role="status" className="me-2" />
          Loading activity logs...
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <h1 className="mb-0">System Activity Logs</h1>
          <p className="text-muted">Track all system activities and changes</p>
        </Col>
        <Col xs="auto" className="d-flex align-items-center">
          <Button variant="outline-primary" onClick={fetchLogs}>
            Refresh Logs
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}

      <Card className="mb-4 shadow-sm border-0">
        <Card.Body>
          <Row>
            <Col md={6}>
              <InputGroup className="mb-3">
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Activity Types</option>
                {activityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
              >
                <option value="all">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table responsive hover>
            <thead className="bg-light">
              <tr>
                <th>User</th>
                <th>Activity Type</th>
                <th>Details</th>
                <th>Date & Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div>
                        <div className="fw-semibold">
                          {log.profiles.first_name} {log.profiles.last_name}
                        </div>
                        <div className="text-muted small">
                          {log.profiles.email}
                        </div>
                      </div>
                    </td>
                    <td>{getActivityBadge(log.activity_type)}</td>
                    <td>
                      <div
                        className="text-truncate"
                        style={{ maxWidth: "300px" }}
                      >
                        {log.activity_details}
                      </div>
                    </td>
                    <td>
                      {new Date(log.created_at).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => viewLogDetails(log)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Log Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Activity Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <h6>User</h6>
                  <p>
                    {selectedLog.profiles.first_name}{" "}
                    {selectedLog.profiles.last_name}
                    <br />
                    <small className="text-muted">
                      {selectedLog.profiles.email}
                    </small>
                    <br />
                    <small className="text-muted">
                      ID: {selectedLog.user_id}
                    </small>
                  </p>
                </Col>
                <Col md={6}>
                  <h6>Activity Type</h6>
                  <p>{getActivityBadge(selectedLog.activity_type)}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <h6>Date & Time</h6>
                  <p>
                    {new Date(selectedLog.created_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </Col>
                <Col md={6}>
                  <h6>Related To</h6>
                  <p>
                    {selectedLog.project_id && (
                      <>
                        <strong>Project ID:</strong> {selectedLog.project_id}
                        <br />
                      </>
                    )}
                    {selectedLog.task_id && (
                      <>
                        <strong>Task ID:</strong> {selectedLog.task_id}
                      </>
                    )}
                    {!selectedLog.project_id &&
                      !selectedLog.task_id &&
                      "System Activity"}
                  </p>
                </Col>
              </Row>

              <h6>Activity Details</h6>
              <Card className="bg-light">
                <Card.Body>
                  <p className="mb-0">{selectedLog.activity_details}</p>
                </Card.Body>
              </Card>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDetailsModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LogChanges;
