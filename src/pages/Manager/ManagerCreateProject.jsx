import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Form,
  Alert,
  Container,
  Row,
  Col,
  Card,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { Link } from "react-router-dom";
import { logActivity } from "../../lib/logger";

const CreatePage = () => {
  // STATE FOR PROJECTS LIST
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState("");

  // MODAL STATE
  const [showModal, setShowModal] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  // FORM STATE
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "planned",
    team_id: "",
    manager_id: "",
    start_date: "",
    due_date: "",
  });

  // DATA STATE
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  // handleChange — ADD THIS (was missing)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // notifyTeamMembers (kept your fixed function)
  const notifyTeamMembers = async (projectId, projectName, type, teamId) => {
    try {
      if (!session?.user?.id) {
        console.warn("⚠ No session user found, skipping notifications.");
        return;
      }

      console.log("🔔 Notifying team members for team:", teamId);

      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (error) throw error;

      if (!teamMembers || teamMembers.length === 0) {
        console.log("ℹ No team members found for this team.");
        return;
      }

      const notificationPromises = teamMembers.map((member) =>
        supabase.from("notifications").insert({
          type: type,
          user_id: member.user_id,
          actor_id: session.user.id,
          project_id: projectId,
          message:
            type === "project_created"
              ? `New project "${projectName}" was created and assigned to your team`
              : `Project "${projectName}" has been updated`,
          is_read: false,
          created_at: new Date().toISOString(),
        })
      );

      const results = await Promise.all(notificationPromises);

      results.forEach((result, index) => {
        if (result.error) {
          console.error(
            `❌ Error creating notification for member ${index}:`,
            result.error
          );
        } else {
          console.log(
            `✅ Notification created for member ${index}:`,
            result.data
          );
        }
      });

      console.log("📨 Total notifications created:", results.length);
    } catch (err) {
      console.error("Error notifying team members:", err);
    }
  };

  // Check for active session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);

        const { data: subscription } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            setSession(newSession);
            if (newSession) {
              await fetchUsers();
              await fetchTeams();
              await fetchProjects();
            }
          }
        );

        return () => {
          subscription?.unsubscribe();
        };
      } catch (err) {
        setError(err.message);
      }
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch data when session changes
  useEffect(() => {
    if (session) {
      fetchProjects();
      fetchUsers();
      fetchTeams();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // FETCH PROJECTS
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!session?.user?.id) {
        throw new Error("No user session found");
      }

      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          teams (name, description),
          manager:profiles!projects_manager_id_fkey (first_name, last_name, email)
        `
        )
        .eq("manager_id", session.user.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error("Error fetching projects:", err.message);
      setError("Error loading projects: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // FETCH USERS
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err.message);
      setError("Error loading users: " + err.message);
    }
  };

  // FETCH TEAMS
  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, description")
        .order("name", { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error("Error fetching teams:", err.message);
      setError("Error loading teams: " + err.message);
    }
  };

  // MODAL HANDLERS
  const handleShowModal = (project = null) => {
    setCurrentProject(project);
    setFormData({
      name: project?.name || "",
      description: project?.description || "",
      status: project?.status || "planned",
      team_id: project?.team_id || "",
      manager_id: project?.manager_id || session?.user?.id || "",
      start_date: project?.start_date?.split?.("T")[0] || "",
      due_date: project?.due_date?.split?.("T")[0] || "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentProject(null);
  };

  // FORM SUBMIT (CREATE/UPDATE)
  // FORM SUBMIT (CREATE/UPDATE)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    console.log("🟡 HANDLE SUBMIT STARTED");

    try {
      if (!session?.user?.id) throw new Error("No session user");
      console.log("✅ Session user:", session.user.id);

      if (currentProject) {
        // Update project
        console.log("🟡 UPDATING EXISTING PROJECT...");
        const { error } = await supabase
          .from("projects")
          .update({
            name: formData.name,
            description: formData.description,
            status: formData.status,
            team_id: formData.team_id,
            manager_id: formData.manager_id,
            start_date: formData.start_date,
            due_date: formData.due_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentProject.id)
          .eq("manager_id", session.user.id);

        if (error) throw error;
        console.log("✅ PROJECT UPDATED SUCCESSFULLY");

        await logActivity({
          type: "project_updated",
          details: `Manager updated project "${formData.name}".`,
          projectId: currentProject.id,
          userId: session.user.id,
        });

        console.log("🟡 CALLING notifyTeamMembers FOR UPDATE...");
        await notifyTeamMembers(
          currentProject.id,
          formData.name,
          "project_updated",
          formData.team_id
        );
        console.log("✅ NOTIFY TEAM MEMBERS CALLED FOR UPDATE");
      } else {
        // Create new project
        console.log("🟡 CREATING NEW PROJECT...");
        const { data, error } = await supabase
          .from("projects")
          .insert({
            name: formData.name,
            description: formData.description,
            status: formData.status,
            team_id: formData.team_id,
            manager_id: session.user.id,
            start_date: formData.start_date,
            due_date: formData.due_date,
            created_by: session.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        console.log("✅ PROJECT CREATED SUCCESSFULLY, ID:", data.id);

        await logActivity({
          type: "project_created",
          details: `Manager created project "${formData.name}".`,
          projectId: data.id,
          userId: session.user.id,
        });

        console.log("🟡 CALLING notifyTeamMembers FOR CREATE...");
        await notifyTeamMembers(
          data.id,
          formData.name,
          "project_created",
          formData.team_id
        );
        console.log("✅ NOTIFY TEAM MEMBERS CALLED FOR CREATE");
      }

      console.log("🟡 FETCHING UPDATED PROJECTS...");
      await fetchProjects();
      console.log("🟡 CLOSING MODAL...");
      handleCloseModal();
      console.log("✅ ALL OPERATIONS COMPLETED SUCCESSFULLY");
    } catch (err) {
      console.error("🔴 ERROR IN HANDLE SUBMIT:", err.message);
      setError("Error saving project: " + err.message);
    }
  };
  // DELETE PROJECT
  const handleDeleteProject = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("manager_id", session.user.id);

      if (error) throw error;

      await logActivity({
        type: "project_deleted",
        details: `Manager deleted project "${projectName}".`,
        projectId: projectId,
        userId: session.user.id,
      });

      fetchProjects();
    } catch (err) {
      setError("Error deleting project: " + err.message);
    }
  };

  // HELPERS
  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusText = (status) => {
    const map = {
      planned: "Planned",
      in_progress: "In Progress",
      on_hold: "On Hold",
      completed: "Completed",
    };
    return map[status] || status;
  };

  const getStatusVariant = (status) => {
    const map = {
      planned: "secondary",
      in_progress: "primary",
      on_hold: "warning",
      completed: "success",
    };
    return map[status] || "secondary";
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(filterText.toLowerCase()) ||
      p.description?.toLowerCase().includes(filterText.toLowerCase()) ||
      p.teams?.name?.toLowerCase().includes(filterText.toLowerCase())
  );

  const projectStats = {
    total: projects.length,
    planned: projects.filter((p) => p.status === "planned").length,
    in_progress: projects.filter((p) => p.status === "in_progress").length,
    on_hold: projects.filter((p) => p.status === "on_hold").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  // AUTH GUARD
  if (!session) {
    return (
      <Container className="auth-container d-flex justify-content-center align-items-center min-vh-100">
        <Card style={{ width: "400px" }}>
          <Card.Body>
            <h2 className="text-center mb-4">Sign In Required</h2>
            <p className="text-center">Please sign in to view your projects.</p>
            <Button
              variant="primary"
              onClick={() =>
                supabase.auth.signInWithPassword({
                  email: "demo@example.com",
                  password: "demo123",
                })
              }
              className="w-100"
            >
              Sign In (Demo)
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // JSX RENDER
  return (
    <Container fluid className="projects-container">
      {/* HEADER */}
      <Row className="projects-header align-items-center mb-4">
        <Col md={8}>
          <h2>Manager Dashboard</h2>
          <p className="text-muted">
            Managing your projects - {session.user.email}
          </p>
        </Col>
        <Col md={4} className="text-end">
          <div className="d-flex justify-content-end gap-2">
            <Button variant="primary" onClick={() => handleShowModal()}>
              + New Project
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => supabase.auth.signOut()}
            >
              Sign Out
            </Button>
          </div>
        </Col>
      </Row>

      {/* STATS */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{projectStats.total}</h3>
              <p>Total Projects</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info">{projectStats.in_progress}</h3>
              <p>In Progress</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">{projectStats.on_hold}</h3>
              <p>On Hold</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{projectStats.completed}</h3>
              <p>Completed</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* FILTER BAR */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Search projects by name, description, or team..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </Col>
        <Col md={6} className="text-end">
          <Button variant="outline-info" onClick={fetchProjects}>
            Refresh
          </Button>
        </Col>
      </Row>

      {/* ERROR ALERT */}
      {error && (
        <Alert
          variant="danger"
          className="mb-3"
          onClose={() => setError(null)}
          dismissible
        >
          {error}
        </Alert>
      )}

      {/* LOADING */}
      {loading && (
        <div className="text-center my-4">Loading your projects...</div>
      )}

      {/* PROJECTS LIST */}
      <Row>
        {filteredProjects.map((project) => (
          <Col key={project.id} md={6} lg={4} className="mb-4">
            <Card className="project-card h-100 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <Card.Title className="h5">{project.name}</Card.Title>
                  <span
                    className={`badge bg-${getStatusVariant(project.status)}`}
                  >
                    {getStatusText(project.status)}
                  </span>
                </div>
                <Card.Text>
                  <div className="mb-2">
                    <strong>Description:</strong>{" "}
                    {project.description || "No description"}
                  </div>
                  <div className="mb-2">
                    <strong>Team:</strong>{" "}
                    <span className="text-info">
                      {project.teams?.name || "Unassigned"}
                    </span>
                  </div>
                  <div className="mb-2">
                    <strong>Start Date:</strong>{" "}
                    {formatDate(project.start_date)}
                  </div>
                  <div className="mb-2">
                    <strong>Due Date:</strong> {formatDate(project.due_date)}
                  </div>
                  <div className="mb-2">
                    <strong>Created:</strong> {formatDate(project.created_at)}
                  </div>
                </Card.Text>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    as={Link}
                    to={`/manager/project/${project.id}`}
                    variant="primary"
                    size="sm"
                  >
                    Manage
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleShowModal(project)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() =>
                      handleDeleteProject(project.id, project.name)
                    }
                  >
                    Delete
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* EMPTY STATES */}
      {!loading && filteredProjects.length === 0 && projects.length === 0 && (
        <div className="text-center my-5">
          <Card className="border-0">
            <Card.Body>
              <h4 className="text-muted">No projects found</h4>
              <p>You don't have any projects assigned as manager yet.</p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleShowModal()}
              >
                Create Your First Project
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {!loading && filteredProjects.length === 0 && projects.length > 0 && (
        <div className="text-center my-5">
          <Card className="border-0">
            <Card.Body>
              <h4 className="text-muted">No projects match your search</h4>
              <p>Try adjusting your search terms or clear the filter.</p>
              <Button
                variant="outline-secondary"
                onClick={() => setFilterText("")}
              >
                Clear Filter
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {currentProject ? "Edit Project" : "Create New Project"}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Project Name *</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter project name"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter project description"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Team *</Form.Label>
                  <Form.Select
                    name="team_id"
                    value={formData.team_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Due Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Manager</Form.Label>
              {/* Keep manager locked to current user to prevent accidental reassign */}
              <Form.Select
                name="manager_id"
                value={formData.manager_id}
                disabled
              >
                <option value={session?.user?.id}>
                  You ({session?.user?.email})
                </option>
              </Form.Select>
              <Form.Text className="text-muted">
                You are automatically assigned as the project manager
              </Form.Text>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {currentProject ? "Update Project" : "Create Project"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default CreatePage;
