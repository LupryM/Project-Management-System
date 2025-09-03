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
  Tabs,
  Tab,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { Link } from "react-router-dom";
import { logActivity } from "../../lib/logger";

const ManagerProjectDashboard = () => {
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
        setError(error.message);
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
      setError(null);

      if (!session?.user?.id) {
        throw new Error("No user session found");
      }

      // Only fetch projects where the current user is the manager
      let query = supabase.from("projects").select(`
          *,
          teams (name, description),
          manager:profiles!projects_manager_id_fkey (first_name, last_name, email)
        `).eq("manager_id", session.user.id);

      const { data, error } = await query.order("due_date", {
        ascending: true,
      });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error.message);
      setError("Error loading projects: " + error.message);
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

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error.message);
      setError("Error loading users: " + error.message);
    }
  };

  // FETCH TEAMS FROM SUPABASE
  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, description")
        .order("name", { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error("Error fetching teams:", error.message);
      setError("Error loading teams: " + error.message);
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
    setError(null);

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
          .eq("manager_id", session.user.id); // Ensure only manager can edit their projects

        if (error) throw error;

        // Log the activity
        await logActivity({
          type: "project_updated",
          details: `Manager updated project "${formData.name}".`,
          projectId: currentProject.id,
          userId: session.user.id,
        });
      } else {
        // Add new project with current user as manager
        const { data, error } = await supabase.from("projects").insert({
          name: formData.name,
          description: formData.description,
          status: formData.status,
          team_id: formData.team_id,
          manager_id: session.user.id, // Set current user as manager
          start_date: formData.start_date,
          due_date: formData.due_date,
          created_by: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select().single();

        if (error) throw error;

        // Log the activity
        await logActivity({
          type: "project_created",
          details: `Manager created project "${formData.name}".`,
          projectId: data.id,
          userId: session.user.id,
        });
      }

      // Refresh projects list
      fetchProjects();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving project:", error.message);
      setError("Error saving project: " + error.message);
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
        .eq("manager_id", session.user.id); // Ensure only manager can delete their projects

      if (error) throw error;

      // Log the activity
      await logActivity({
        type: "project_deleted",
        details: `Manager deleted project "${projectName}".`,
        projectId: projectId,
        userId: session.user.id,
      });

      fetchProjects();
    } catch (error) {
      setError("Error deleting project: " + error.message);
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
    if (!dateString) return "Not set";
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

  // GET STATUS BADGE VARIANT
  const getStatusVariant = (status) => {
    const variantMap = {
      planned: "secondary",
      in_progress: "primary",
      on_hold: "warning",
      completed: "success",
    };
    return variantMap[status] || "secondary";
  };

  // FILTER PROJECTS
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(filterText.toLowerCase()) ||
    project.description?.toLowerCase().includes(filterText.toLowerCase()) ||
    project.teams?.name?.toLowerCase().includes(filterText.toLowerCase())
  );

  // GET PROJECT STATS
  const projectStats = {
    total: projects.length,
    planned: projects.filter(p => p.status === 'planned').length,
    in_progress: projects.filter(p => p.status === 'In_progress').length,
    on_hold: projects.filter(p => p.status === 'on_hold').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  return (
    <Container fluid className="projects-container">
      {/* HEADER SECTION */}
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

      {/* STATS CARDS */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{projectStats.total}</h3>
              <p className="mb-0">Total Projects</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info">{projectStats.in_progress}</h3>
              <p className="mb-0">In Progress</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">{projectStats.on_hold}</h3>
              <p className="mb-0">On Hold</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{projectStats.completed}</h3>
              <p className="mb-0">Completed</p>
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

      {/* LOADING STATE */}
      {loading && <div className="text-center my-4">Loading your projects...</div>}

      {/* PROJECTS LIST */}
      <Row>
        {filteredProjects.map((project) => (
          <Col key={project.id} md={6} lg={4} className="mb-4">
            <Card className="project-card h-100 shadow-sm">
              <Card.Body>
                <div className="project-header d-flex justify-content-between align-items-start mb-3">
                  <Card.Title className="h5">{project.name}</Card.Title>
                  <span
                    className={`badge bg-${getStatusVariant(project.status)}`}
                  >
                    {getStatusText(project.status)}
                  </span>
                </div>
                <Card.Text className="project-details">
                  <div className="mb-2">
                    <strong>Description:</strong>{" "}
                    <span className="text-muted">
                      {project.description || "No description"}
                    </span>
                  </div>
                  <div className="mb-2">
                    <strong>Team:</strong>{" "}
                    <span className="text-info">
                      {project.teams?.name || "Unassigned"}
                    </span>
                  </div>
                  <div className="mb-2">
                    <strong>Start Date:</strong>{" "}
                    <span className="text-muted">
                      {formatDate(project.start_date)}
                    </span>
                  </div>
                  <div className="mb-2">
                    <strong>Due Date:</strong>{" "}
                    <span className="text-muted">
                      {formatDate(project.due_date)}
                    </span>
                  </div>
                  <div className="mb-2">
                    <strong>Created:</strong>{" "}
                    <span className="text-muted">
                      {formatDate(project.created_at)}
                    </span>
                  </div>
                </Card.Text>
                <div className="project-actions d-flex gap-2 flex-wrap">
                  <Button
                    as={Link}
                    to={`/manager/project/${project.id}`}
                    variant="primary"
                    size="sm"
                    className="flex-grow-1"
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
                    onClick={() => handleDeleteProject(project.id, project.name)}
                  >
                    Delete
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* EMPTY STATE */}
      {!loading && filteredProjects.length === 0 && projects.length === 0 && (
        <div className="text-center my-5">
          <Card className="border-0">
            <Card.Body>
              <h4 className="text-muted">No projects found</h4>
              <p className="text-muted">
                You don't have any projects assigned as manager yet.
              </p>
              <Button variant="primary" size="lg" onClick={() => handleShowModal()}>
                Create Your First Project
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* FILTERED EMPTY STATE */}
      {!loading && filteredProjects.length === 0 && projects.length > 0 && (
        <div className="text-center my-5">
          <Card className="border-0">
            <Card.Body>
              <h4 className="text-muted">No projects match your search</h4>
              <p className="text-muted">
                Try adjusting your search terms or clear the filter.
              </p>
              <Button variant="outline-secondary" onClick={() => setFilterText("")}>
                Clear Filter
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* CREATE/EDIT PROJECT MODAL */}
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
                onChange={(e) =>
                  setFormData({ ...formData, manager_id: e.target.value })
                }
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

export default ManagerProjectDashboard;