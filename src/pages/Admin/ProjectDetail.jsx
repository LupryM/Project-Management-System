import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Button, Alert, Tabs, Tab } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import TeamManagement from "../TeamManagement";
import TaskForm from "./TaskForm";
import TaskList from "./TaskList";

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [tasksUpdated, setTasksUpdated] = useState(0);
  const [teamMembersUpdated, setTeamMembersUpdated] = useState(0);

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "planned",
    team_id: "",
    manager_id: "",
    start_date: "",
    due_date: "",
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
          await fetchAllUsers();
          await fetchProject();
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [projectId]);

  useEffect(() => {
    if (project && project.team_id) {
      fetchTeamMembers();
    }
  }, [project, teamMembersUpdated]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          teams (name, description, created_by),
          manager:profiles!manager_id (first_name, last_name, email)
        `
        )
        .eq("id", projectId)
        .single();

      if (error) throw error;
      setProject(data);
      setProjectForm({
        name: data.name,
        description: data.description || "",
        status: data.status,
        team_id: data.team_id,
        manager_id: data.manager_id,
        start_date: data.start_date?.split("T")[0] || "",
        due_date: data.due_date?.split("T")[0] || "",
      });
    } catch (error) {
      setError("Error loading project: " + error.message);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      if (project && project.team_id) {
        // First try to use the view
        let { data, error } = await supabase
          .from("team_members_with_details")
          .select("*")
          .eq("team_id", project.team_id);

        // If the view doesn't exist or fails, fall back to the direct table
        if (error) {
          console.log("View not available, falling back to direct table query");
          ({ data, error } = await supabase
            .from("team_members")
            .select(
              `
              *,
              user:profiles (id, first_name, last_name, email)
            `
            )
            .eq("team_id", project.team_id));
        }

        if (error) throw error;
        setTeamMembers(data || []);
      }
    } catch (error) {
      console.error("Error loading team members:", error.message);
      setError("Error loading team members: " + error.message);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      setError("Error loading users: " + error.message);
    }
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          ...projectForm,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (error) throw error;
      setEditing(false);
      fetchProject();
    } catch (error) {
      setError("Error saving project: " + error.message);
    }
  };

  const handleTaskUpdated = () => {
    setTasksUpdated((prev) => prev + 1);
  };

  const handleTeamMembersUpdated = () => {
    setTeamMembersUpdated((prev) => prev + 1);
  };

  const getStatusText = (status) => {
    const statusMap = {
      planned: "Planned",
      in_progress: "In Progress",
      on_hold: "On Hold",
      completed: "Completed",
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <Container fluid className="projects-container">
        <div className="text-center my-4">Loading project...</div>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container fluid className="projects-container">
        <div className="text-center my-5">
          <p>Project not found.</p>
          <Button onClick={() => navigate("/")}>Back to Projects</Button>
        </div>
      </Container>
    );
  }

  const isTeamManager = project.manager_id === session?.user?.id;

  return (
    <Container fluid className="project-detail-container">
      <Button
        variant="outline-secondary"
        className="mb-3"
        onClick={() => navigate("/")}
      >
        &larr; Back to Projects
      </Button>

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

      <div className="project-header mb-4">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h1>{project.name}</h1>
            <p className="text-muted">
              {project.description || "No description"}
            </p>
          </div>
          <div>
            <Button
              variant={editing ? "success" : "outline-primary"}
              onClick={() =>
                editing
                  ? handleProjectSubmit({ preventDefault: () => {} })
                  : setEditing(true)
              }
            >
              {editing ? "Save Changes" : "Edit Project"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="overview" title="Overview">
          <div className="row">
            <div className="col-md-8">
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Project Details</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <div>
                      <span
                        className={`badge ${
                          project.status === "completed"
                            ? "bg-success"
                            : project.status === "in_progress"
                            ? "bg-primary"
                            : project.status === "on_hold"
                            ? "bg-warning"
                            : "bg-secondary"
                        }`}
                      >
                        {getStatusText(project.status)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Manager</label>
                    <p>
                      {project.manager
                        ? `${project.manager.first_name} ${project.manager.last_name}`
                        : "Unassigned"}
                    </p>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Start Date</label>
                        <p>
                          {project.start_date
                            ? new Date(project.start_date).toLocaleDateString()
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Due Date</label>
                        <p>
                          {project.due_date
                            ? new Date(project.due_date).toLocaleDateString()
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Team Info</h5>
                </div>
                <div className="card-body">
                  <p>
                    <strong>Team:</strong> {project.teams?.name || "Unassigned"}
                  </p>
                  <p>
                    <strong>Team Description:</strong>{" "}
                    {project.teams?.description || "No description"}
                  </p>
                  <p>
                    <strong>Team Members:</strong> {teamMembers.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Tab>

        <Tab eventKey="team" title="Team Management">
          <TeamManagement
            teamId={project.team_id}
            isTeamManager={isTeamManager}
            onTeamUpdated={handleTeamMembersUpdated}
          />
        </Tab>

        <Tab eventKey="tasks" title="Tasks">
          <TaskForm
            projectId={projectId}
            teamMembers={teamMembers}
            onTaskCreated={handleTaskUpdated}
          />
          <TaskList
            projectId={projectId}
            onTaskUpdated={handleTaskUpdated}
            key={tasksUpdated}
          />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default ProjectDetail;
