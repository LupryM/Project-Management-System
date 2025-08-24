// pages/General/Unauthorized.js
import React from "react";
import { Container, Card, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Container className="d-flex justify-content-center align-items-center min-vh-100">
      <Card className="text-center" style={{ width: "24rem" }}>
        <Card.Body>
          <Card.Title>Access Denied</Card.Title>
          <Card.Text>You don't have permission to access this page.</Card.Text>
          <Button variant="primary" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Unauthorized;
