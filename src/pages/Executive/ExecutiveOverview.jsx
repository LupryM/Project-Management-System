import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";

const ExecutiveDashboard = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [executiveName, setExecutiveName] = useState("Executive");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser?.user) return;

        const userId = currentUser.user.id;

        // Get executive profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", userId)
          .single();

        setExecutiveName(profile ? `${profile.first_name} ${profile.last_name}` : "Executive");

        // Projects stats
        const { data: projects } = await supabase.from("projects").select("status");
        const totalProjects = projects?.length || 0;
        const activeProjects = projects?.filter(p => p.status === "in_progress").length || 0;
        const completedProjects = projects?.filter(p => p.status === "completed").length || 0;

        // Total users
        const { data: users } = await supabase.from("profiles").select("*");
        const totalUsers = users?.length || 0;

        setStats({ totalProjects, activeProjects, completedProjects, totalUsers });
      } catch (error) {
        console.error("Error fetching executive dashboard stats:", error.message);
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
      <h1 className="mb-4">Welcome, {executiveName}!</h1>
      <Row className="g-4">
        <Col md={3}>
          <Card className="shadow-sm text-center p-3">
            <Card.Body>
              <Card.Title>Total Projects</Card.Title>
              <h2>{stats.totalProjects}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm text-center p-3">
            <Card.Body>
              <Card.Title>Active Projects</Card.Title>
              <h2>{stats.activeProjects}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm text-center p-3">
            <Card.Body>
              <Card.Title>Completed Projects</Card.Title>
              <h2>{stats.completedProjects}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm text-center p-3">
            <Card.Body>
              <Card.Title>Total Users</Card.Title>
              <h2>{stats.totalUsers}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ExecutiveDashboard;
