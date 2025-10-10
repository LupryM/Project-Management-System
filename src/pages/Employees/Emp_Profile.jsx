import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Badge,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import {
  BsPerson,
  BsEnvelope,
  BsShieldCheck,
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsCalendar,
} from "react-icons/bs";

const EmployeeProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "",
    status: "",
    created_at: "",
  });
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
  });
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    const changed =
      formData.first_name !== profile.first_name ||
      formData.last_name !== profile.last_name;
    setHasChanges(changed);
  }, [formData, profile]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      setUser(userData.user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, role, status, created_at")
        .eq("id", userData.user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);
      setFormData({
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
      });
    } catch (err) {
      console.error("Error fetching profile:", err.message);
      showAlert("Error loading profile: " + err.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      showAlert("First name and last name are required", "warning");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) => ({
        ...prev,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
      }));

      showAlert("Profile updated successfully!", "success");
      setHasChanges(false);
    } catch (err) {
      console.error("Error updating profile:", err.message);
      showAlert("Error updating profile: " + err.message, "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
    });
    setHasChanges(false);
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => {
      setAlert({ show: false, message: "", variant: "" });
    }, 5000);
  };

  const getStatusVariant = (status) => {
    return status?.toLowerCase() === "active" ? "success" : "danger";
  };

  const getRoleBadgeVariant = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "danger";
      case "manager":
        return "primary";
      case "employee":
        return "info";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-4 bg-light" style={{ minHeight: "100vh" }}>
        <div className="text-center my-5 py-5">
          <Spinner animation="border" role="status" className="mb-3" />
          <p>Loading your profile...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 bg-light" style={{ minHeight: "100vh" }}>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-1 fw-bold">My Profile</h2>
          <p className="text-muted mb-0">
            Manage your personal information
          </p>
        </Col>
      </Row>

      {alert.show && (
        <Alert
          variant={alert.variant}
          onClose={() => setAlert({ show: false, message: "", variant: "" })}
          dismissible
          className="mb-4"
        >
          {alert.variant === "success" ? (
            <BsCheckCircleFill className="me-2" />
          ) : (
            <BsExclamationTriangleFill className="me-2" />
          )}
          {alert.message}
        </Alert>
      )}

      <Row>
        <Col lg={4} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center p-4">
              <div className="bg-primary bg-opacity-10 p-4 rounded-circle d-inline-flex mb-3">
                <BsPerson size={64} className="text-primary" />
              </div>
              <h4 className="mb-2">
                {profile.first_name} {profile.last_name}
              </h4>
              <p className="text-muted mb-3">{profile.email}</p>
              <div className="d-flex gap-2 justify-content-center mb-4">
                <Badge bg={getRoleBadgeVariant(profile.role)} className="px-3 py-2">
                  {profile.role || "Employee"}
                </Badge>
                <Badge bg={getStatusVariant(profile.status)} className="px-3 py-2">
                  {profile.status || "Active"}
                </Badge>
              </div>
              <hr />
              <div className="text-start mt-4">
                <div className="d-flex align-items-center mb-3">
                  <BsEnvelope className="text-muted me-3" size={20} />
                  <div>
                    <small className="text-muted d-block">Email</small>
                    <span className="fw-medium">{profile.email}</span>
                  </div>
                </div>
                <div className="d-flex align-items-center mb-3">
                  <BsShieldCheck className="text-muted me-3" size={20} />
                  <div>
                    <small className="text-muted d-block">Role</small>
                    <span className="fw-medium">{profile.role || "Employee"}</span>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <BsCalendar className="text-muted me-3" size={20} />
                  <div>
                    <small className="text-muted d-block">Member Since</small>
                    <span className="fw-medium">
                      {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">Edit Profile Information</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-medium">
                        First Name <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        placeholder="Enter your first name"
                        required
                        disabled={saving}
                        size="lg"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-medium">
                        Last Name <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        placeholder="Enter your last name"
                        required
                        disabled={saving}
                        size="lg"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Alert variant="info" className="mb-4">
                  <BsExclamationTriangleFill className="me-2" />
                  <strong>Note:</strong> Your email address and role cannot be changed here. 
                  Please contact your administrator if you need to update these fields.
                </Alert>

                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={saving || !hasChanges}
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <BsCheckCircleFill className="me-2" />
                        Save Changes
                      </>
                    )}
                  </Button>

                  {hasChanges && (
                    <Button
                      variant="outline-secondary"
                      onClick={handleCancel}
                      disabled={saving}
                      size="lg"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeProfile;