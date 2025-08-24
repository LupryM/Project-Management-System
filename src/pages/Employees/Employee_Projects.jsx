import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import "./Css/Project_List_Page.css";

const ViewProjects = () => {
  // STATE FOR PROJECTS LIST
  const [projects, setProjects] = useState([
    {
      id: 1,
      title: "New Blog Series",
      category: "Content",
      deadline: "2023-12-15",
      priority: "High",
      status: "In Progress",
      assignedTo: "john@company.com",
    },
    {
      id: 2,
      title: "Website Redesign",
      category: "Design",
      deadline: "2024-01-20",
      priority: "Medium",
      status: "Not Started",
      assignedTo: "jane@company.com",
    },
  ]);

  // MODAL STATE
  const [showModal, setShowModal] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  // FORM STATE
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "in_progress",
    assigneeId: "",
    dueDate: "",
  });

  // MOCK USERS
  const users = [
    { id: "1", firstName: "John", lastName: "Doe", email: "john@company.com" },
    {
      id: "2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@company.com",
    },
  ];

  // HANDLE MODAL OPEN/CLOSE
  const handleShowModal = (project = null) => {
    setCurrentProject(project);
    setFormData({
      title: project?.title || "",
      description: project?.description || "",
      status: project?.status || "in_progress",
      assigneeId: project?.assignedTo || "",
      dueDate: project?.deadline || "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentProject(null);
  };

  // HANDLE FORM SUBMIT
  const handleSubmit = (e) => {
    e.preventDefault();

    if (currentProject) {
      // Update existing project
      setProjects(
        projects.map((proj) =>
          proj.id === currentProject.id ? { ...proj, ...formData } : proj
        )
      );
    } else {
      // Add new project
      const newProject = {
        id: projects.length + 1,
        title: formData.title,
        category: "General",
        deadline: formData.dueDate,
        priority: "Medium",
        status: formData.status,
        assignedTo: formData.assigneeId,
      };
      setProjects([...projects, newProject]);
    }

    handleCloseModal();
  };

  return (
    <div className="projects-container">
      {/* HEADER SECTION */}
      <div className="projects-header">
        <h2>Active Projects</h2>
        <div className="controls">
          <input type="text" placeholder="Filter projects..." />
          <button className="card" onClick={() => handleShowModal()}>
            + New Project
          </button>
        </div>
      </div>

      {/* PROJECTS LIST */}
      <div className="projects-list">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <div className="project-header">
              <h3>{project.title}</h3>
              <span className={`priority ${project.priority.toLowerCase()}`}>
                {project.priority}
              </span>
            </div>
            <div className="project-details">
              <div>
                <strong>Category:</strong> {project.category}
              </div>
              <div>
                <strong>Deadline:</strong> {project.deadline}
              </div>
              <div>
                <strong>Status:</strong> {project.status}
              </div>
              <div>
                <strong>Assigned To:</strong> {project.assignedTo}
              </div>
            </div>
            <div className="project-actions">
              <button>View</button>
              <button onClick={() => handleShowModal(project)}>Edit</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {currentProject ? "Edit Project" : "Create New Project"}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Project Title</Form.Label>
              <Form.Control
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter project title"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Assigned To</Form.Label>
              <Form.Select
                value={formData.assigneeId}
                onChange={(e) =>
                  setFormData({ ...formData, assigneeId: e.target.value })
                }
              >
                <option value="">Select assignee</option>
                {users.map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                required
              />
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
    </div>
  );
};

export default ViewProjects;
