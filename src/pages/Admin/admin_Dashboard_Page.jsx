import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalProjects: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Users stats
        const { data: users } = await supabase.from("profiles").select("*");
        const totalUsers = users?.length || 0;
        const activeUsers = users?.filter(u => u.status === "Active").length || 0;
        const inactiveUsers = users?.filter(u => u.status === "Inactive").length || 0;

        // Projects stats
        const { data: projects } = await supabase.from("projects").select("*");
        const totalProjects = projects?.length || 0;

        setStats({ totalUsers, activeUsers, inactiveUsers, totalProjects });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Container fluid className="p-4 text-center">
        <Spinner animation="border" role="status" className="me-2" />
        Loading dashboard...
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <h1 className="mb-4">Welcome, Admin!</h1>
      <Row className="g-4">
        <Col md={3}>
          <Card className="shadow-sm text-center p-3">
            <Card.Body>
              <Card.Title>Total Users</Card.Title>
              <h2>{stats.totalUsers}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm text-center p-3">
            <Card.Body>
              <Card.Title>Active Users</Card.Title>
              <h2>{stats.activeUsers}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm text-center p-3">
            <Card.Body>
              <Card.Title>Inactive Users</Card.Title>
              <h2>{stats.inactiveUsers}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm text-center p-3">
            <Card.Body>
              <Card.Title>Total Projects</Card.Title>
              <h2>{stats.totalProjects}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;
