import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Form,
  Container,
  Row,
  Col,
  Card,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { Link } from "react-router-dom";

const ManagerProjectList = () => {
  // STATE FOR PROJECTS LIST
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Check for active session on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          setSession(session);
          if (session) {
            await fetchUsers();
            await fetchTeams();
            await fetchProjects();
          }
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error("Auth initialization error:", error.message);
      }
    };

    initializeAuth();
  }, []);

  // Fetch data when session changes
  useEffect(() => {
    if (session) {
      fetchProjects();
    } else {
      setLoading(false);
    }
  }, [session]);

  // FETCH PROJECTS FROM SUPABASE - ONLY MANAGER'S PROJECTS
  const fetchProjects = async () => {
    try {
      setLoading(true);
      if (!session?.user?.id) return;

      let query = supabase
        .from("projects")
        .select(
          `
          *,
          teams (name),
          manager:profiles!projects_manager_id_fkey (first_name, last_name)
        `
        )
        .eq("manager_id", session.user.id);

      const { data, error } = await query.order("due_date", {
        ascending: true,
      });

      if (!error) setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // FETCH USERS FROM SUPABASE
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .order("first_name", { ascending: true });

      if (!error) setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error.message);
    }
  };

  // FETCH TEAMS FROM SUPABASE
  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, description")
        .order("name", { ascending: true });

      if (!error) setTeams(data || []);
    } catch (error) {
      console.error("Error fetching teams:", error.message);
    }
  };

  // HANDLE MODAL OPEN/CLOSE
  const handleShowModal = (project = null) => {
    setCurrentProject(project);
    setFormData({
      name: project?.name || "",
      description: project?.description || "",
      status: project?.status || "planned",
      team_id: project?.team_id || "",
      manager_id: project?.manager_id || session?.user?.id || "",
      start_date: project?.start_date?.split("T")[0] || "",
      due_date: project?.due_date?.split("T")[0] || "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentProject(null);
  };

  // HANDLE FORM SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (currentProject) {
        // Update existing project - only if current user is the manager
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
      } else {
        // Add new project with current user as manager
        const { error } = await supabase.from("projects").insert({
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
        });

        if (error) throw error;
      }

      fetchProjects();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving project:", error.message);
    }
  };

  // RENDER AUTH COMPONENT IF NOT SIGNED IN
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

  // FORMAT DATE FOR DISPLAY
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // GET STATUS DISPLAY TEXT
  const getStatusText = (status) => {
    const statusMap = {
      planned: "Planned",
      in_progress: "In Progress",
      on_hold: "On Hold",
      completed: "Completed",
    };
    return statusMap[status] || status;
  };

  // GET TEAM NAME BY ID
  const getTeamName = (teamId) => {
    const team = teams.find((team) => team.id === teamId);
    return team ? team.name : "Unassigned";
  };

  // GET MANAGER NAME BY ID
  const getManagerName = (managerId) => {
    const manager = users.find((user) => user.id === managerId);
    return manager
      ? `${manager.first_name} ${manager.last_name}`
      : "Unassigned";
  };

  return (
    <Container fluid className="projects-container">
      {/* HEADER SECTION */}
      <Row className="projects-header align-items-center mb-4">
        <Col md={6}>
          <h2>My Projects</h2>
          <p className="text-muted">
            Projects you manage - {session.user.email}
          </p>
        </Col>
        <Col md={6} className="text-end">
          <div className="d-flex justify-content-end gap-2">
            <Form.Control
              type="text"
              placeholder="Filter projects..."
              className="w-50"
            />
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

      {/* LOADING STATE */}
      {loading && (
        <div className="text-center my-4">Loading your projects...</div>
      )}

      {/* PROJECTS LIST */}
      <Row>
        {projects.map((project) => (
          <Col key={project.id} md={6} lg={4} className="mb-4">
            <Card className="project-card h-100">
              <Card.Body>
                <div className="project-header d-flex justify-content-between align-items-start mb-3">
                  <Card.Title>{project.name}</Card.Title>
                  <span className={`status ${project.status}`}>
                    {getStatusText(project.status)}
                  </span>
                </div>
                <Card.Text className="project-details">
                  <div className="mb-2">
                    <strong>Description:</strong>{" "}
                    {project.description || "No description"}
                  </div>
                  <div className="mb-2">
                    <strong>Team:</strong>{" "}
                    {project.teams?.name || getTeamName(project.team_id)}
                  </div>
                  <div className="mb-2">
                    <strong>Manager:</strong>{" "}
                    {project.manager
                      ? `${project.manager.first_name} ${project.manager.last_name}`
                      : getManagerName(project.manager_id)}
                  </div>
                  <div className="mb-2">
                    <strong>Due Date:</strong> {formatDate(project.due_date)}
                  </div>
                </Card.Text>
                <div className="project-actions d-flex gap-2">
                  <Button
                    as={Link}
                    to={`/project/${project.id}`}
                    variant="outline-primary"
                    size="sm"
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleShowModal(project)}
                  >
                    Edit
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* EMPTY STATE */}
      {!loading && projects.length === 0 && (
        <div className="text-center my-5">
          <h4>No projects found</h4>
          <p>You don't have any projects assigned as manager yet.</p>
          <Button variant="primary" onClick={() => handleShowModal()}>
            Create Your First Project
          </Button>
        </div>
      )}

      {/* MODAL */}
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
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter project name"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter project description"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
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
                    value={formData.team_id}
                    onChange={(e) =>
                      setFormData({ ...formData, team_id: e.target.value })
                    }
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
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Due Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Manager</Form.Label>
              <Form.Select
                value={formData.manager_id}
                disabled={true} // Managers can only manage their own projects
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

export default ManagerProjectList;
