import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Alert,
  ProgressBar,
  Button
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import {
  BsCheckCircleFill,
  BsClockFill,
  BsListTask,
  BsExclamationTriangleFill,
  BsCalendar,
  BsPerson,
  BsGraphUp,
  BsArrowRight
} from "react-icons/bs";
import "./Css/Employee_Dashboard.css";

const EmployeeDashboard = () => {
  const [taskStats, setTaskStats] = useState({
    total: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    completed: 0
  });
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
          await fetchUserProfile(session.user.id);
          await fetchTaskStats(session.user.id);
          await fetchUpcomingTasks(session.user.id);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, avatar_url")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error.message);
    }
  };

  const fetchTaskStats = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("task_assignments")
        .select(
          `
          task:tasks (
            status
          )
        `
        )
        .eq("user_id", userId);

      if (error) throw error;

      // Calculate stats
      const stats = {
        total: data.length,
        todo: data.filter(item => item.task.status === "todo").length,
        in_progress: data.filter(item => item.task.status === "in_progress").length,
        review: data.filter(item => item.task.status === "review").length,
        completed: data.filter(item => item.task.status === "completed").length
      };

      setTaskStats(stats);
    } catch (error) {
      setError("Error loading task stats: " + error.message);
    }
  };

  const fetchUpcomingTasks = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("task_assignments")
        .select(
          `
          task:tasks (
            id,
            title,
            due_date,
            priority,
            project:projects (
              name
            )
          )
        `
        )
        .eq("user_id", userId)
        .order("due_date", { ascending: true })
        .limit(5);

      if (error) throw error;

      // Flatten the data structure
      const tasks = data.map((item) => ({
        id: item.task.id,
        title: item.task.title,
        due_date: item.task.due_date,
        priority: item.task.priority,
        project_name: item.task.project?.name || "Unknown Project",
      }));

      setUpcomingTasks(tasks || []);
    } catch (error) {
      console.error("Error loading upcoming tasks:", error.message);
    }
  };

  const getPriorityVariant = (priority) => {
    const variantMap = {
      1: "danger",
      2: "warning",
      3: "primary",
      4: "secondary",
    };
    return variantMap[priority] || "secondary";
  };

  // Calculate completion percentage
  const completionPercentage = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  if (loading) {
    return (
      <Container fluid className="employee-dashboard">
        <div className="text-center my-5 py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading your dashboard...</p>
        </div>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container fluid className="employee-dashboard">
        <div className="text-center my-5 py-5">
          <BsPerson size={48} className="text-muted mb-3" />
          <h4>Please sign in to view your dashboard</h4>
          <p className="text-muted">You need to be authenticated to access your dashboard</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="employee-dashboard py-4">
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="mb-1">Dashboard</h2>
              {userProfile && (
                <p className="text-muted mb-0">
                  Welcome back, <strong>{userProfile.first_name} {userProfile.last_name}</strong>
                </p>
              )}
            </div>
            <Button variant="outline-primary" href="/tasks">
              View All Tasks <BsArrowRight className="ms-1" />
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert
          variant="danger"
          className="mb-4"
          onClose={() => setError(null)}
          dismissible
        >
          <BsExclamationTriangleFill className="me-2" />
          {error}
        </Alert>
      )}

      {/* Stats Overview Cards */}
      <Row className="mb-4">
        <Col md={6} lg={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm stats-card">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="card-title text-muted">Total Tasks</h6>
                <h3 className="mb-0">{taskStats.total}</h3>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded">
                <BsListTask size={24} className="text-primary" />
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} lg={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm stats-card">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="card-title text-muted">In Progress</h6>
                <h3 className="mb-0">{taskStats.in_progress}</h3>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded">
                <BsClockFill size={24} className="text-primary" />
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} lg={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm stats-card">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="card-title text-muted">Completed</h6>
                <h3 className="mb-0">{taskStats.completed}</h3>
              </div>
              <div className="bg-success bg-opacity-10 p-3 rounded">
                <BsCheckCircleFill size={24} className="text-success" />
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} lg={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm stats-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="card-title text-muted">Completion</h6>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <BsGraphUp size={24} className="text-info" />
                </div>
              </div>
              <h3 className="mb-2">{completionPercentage}%</h3>
              <ProgressBar 
                now={completionPercentage} 
                variant={completionPercentage === 100 ? "success" : "primary"} 
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Upcoming Tasks Section */}
      <Row>
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0 d-flex align-items-center">
                <BsCalendar className="me-2" /> Upcoming Tasks
              </h5>
            </Card.Header>
            <Card.Body>
              {upcomingTasks.length > 0 ? (
                <div className="list-group list-group-flush">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="list-group-item border-0 px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{task.title}</h6>
                          <p className="text-muted mb-0 small">{task.project_name}</p>
                        </div>
                        <div className="text-end">
                          <Badge bg={getPriorityVariant(task.priority)} className="mb-1">
                            {task.priority === 1 ? "Critical" : 
                             task.priority === 2 ? "High" : 
                             task.priority === 3 ? "Medium" : "Low"}
                          </Badge>
                          <p className="text-muted mb-0 small">
                            Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BsCalendar size={36} className="text-muted mb-2" />
                  <p className="text-muted mb-0">No upcoming tasks</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Task Status</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">To Do</span>
                  <span className="fw-bold">{taskStats.todo}</span>
                </div>
                <ProgressBar 
                  now={taskStats.total ? (taskStats.todo / taskStats.total) * 100 : 0} 
                  variant="secondary" 
                />
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">In Progress</span>
                  <span className="fw-bold">{taskStats.in_progress}</span>
                </div>
                <ProgressBar 
                  now={taskStats.total ? (taskStats.in_progress / taskStats.total) * 100 : 0} 
                  variant="primary" 
                />
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">Review</span>
                  <span className="fw-bold">{taskStats.review}</span>
                </div>
                <ProgressBar 
                  now={taskStats.total ? (taskStats.review / taskStats.total) * 100 : 0} 
                  variant="warning" 
                />
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">Completed</span>
                  <span className="fw-bold">{taskStats.completed}</span>
                </div>
                <ProgressBar 
                  now={taskStats.total ? (taskStats.completed / taskStats.total) * 100 : 0} 
                  variant="success" 
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeDashboard;