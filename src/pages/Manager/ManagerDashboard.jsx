import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";

const ManagerDashboard = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    teamMembers: 0,
    tasksInProgress: 0,
    tasksCompleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [managerName, setManagerName] = useState("Manager");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser?.user) return;

        const userId = currentUser.user.id;

        // Get manager profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", userId)
          .single();

        setManagerName(
          profile ? `${profile.first_name} ${profile.last_name}` : "Manager"
        );

        // Total projects managed
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .eq("manager_id", userId);

        const totalProjects = projects?.length || 0;

        // Team members (unique across all projects)
        const { data: teamMembersData } = await supabase
          .from("team_members")
          .select("user_id")
          .in("team_id", projects?.map((p) => p.id) || []);

        const uniqueTeamMembers = [
          ...new Set(teamMembersData?.map((tm) => tm.user_id)),
        ];

        // Tasks
        const { data: tasks } = await supabase
          .from("tasks")
          .select("status")
          .in("project_id", projects?.map((p) => p.id) || []);

        const tasksInProgress =
          tasks?.filter((t) => t.status === "in_progress").length || 0;
        const tasksCompleted =
          tasks?.filter((t) => t.status === "completed").length || 0;

        setStats({
          totalProjects,
          teamMembers: uniqueTeamMembers.length,
          tasksInProgress,
          tasksCompleted,
        });
      } catch (error) {
        console.error("Error fetching manager dashboard stats:", error.message);
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
      <h1 className="mb-4">Welcome, {managerName}!</h1>
      <Row className="g-4">
        <Col md={3}>
          <Card className="shadow-sm text-center p-3">
            <Card.Body>
              <Card.Title>Projects Managed</Card.Title>
              <h2>{stats.totalProjects}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm text-center p-3">
            <Card.Body>
              <Card.Title>Team Members</Card.Title>
              <h2>{stats.teamMembers}</h2>
            </Card.Body>
          </Card>
        </Col>
     
      </Row>
    </Container>
  );
};

export default ManagerDashboard;
