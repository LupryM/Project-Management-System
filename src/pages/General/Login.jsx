// pages/General/Login.js
import React from "react";
import { Container } from "react-bootstrap";
import LoginForm from "../../components/ui/LoginForm";

const LoginPage = () => {
  return (
    // Add the "fluid" prop to the Container
    <Container fluid className="d-flex justify-content-center align-items-center min-vh-100">
      <LoginForm />
    </Container>
  );
};


export default LoginPage;