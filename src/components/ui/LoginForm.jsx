import React, { useState } from "react";
import {
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Container,
  Row,
  Col,
} from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  BsEye,
  BsEyeSlash,
  BsGoogle,
  BsShieldLock,
  BsArrowRight,
  BsFolder,
  BsPeople,
  BsClock,
  BsCheckCircle,
} from "react-icons/bs";

const TransitionLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
        setMessage("Check your email for the confirmation link!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) throw error;
        setMessage("Login successful! Redirecting...");
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (error) {
      setError(error.message || "An error occurred during authentication");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      setError(
        error.message || "An error occurred during Google authentication"
      );
      setGoogleLoading(false);
    }
  };
  // Add this right after your imports in the login page
  const loginStyles = `
  .container-fluid.p-0 {
    padding: 0 !important;
  }
  .row.g-0 {
    margin: 0 !important;
  }
  .col-md-6.p-5 {
    padding: 0 !important;
  }
`;

  // Inject the styles
  if (typeof document !== "undefined") {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = loginStyles;
    document.head.appendChild(styleSheet);
  }
  return (
    <Container fluid className="p-0" style={{ minHeight: "100vh" }}>
      <Row className="g-0" style={{ minHeight: "100vh" }}>
        {/* Left Side - Branding & Features (50%) */}
        <Col
          md={6}
          className="d-flex align-items-center justify-content-center"
          style={{
            background:
              "linear-gradient(135deg, #0f0e17 0%, #1a1a2e 50%, #16213e 100%)",
            color: "white",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Animated Background Elements */}
          <div
            style={{
              position: "absolute",
              top: "15%",
              left: "15%",
              width: "120px",
              height: "120px",
              background:
                "radial-gradient(circle, rgba(11, 94, 215, 0.15) 0%, transparent 70%)",
              borderRadius: "50%",
              animation: "float 6s ease-in-out infinite",
            }}
          />
          <div
            style={{
              padding: "2rem", // Custom padding instead of p-5
              position: "absolute",
              bottom: "20%",
              right: "20%",
              width: "80px",
              height: "80px",
              background:
                "radial-gradient(circle, rgba(11, 94, 215, 0.1) 0%, transparent 70%)",
              borderRadius: "50%",
              animation: "float 8s ease-in-out infinite 1s",
            }}
          />

          <div
            className="w-100"
            style={{ maxWidth: "480px", zIndex: 2, position: "relative" }}
          >
            {/* Logo/Brand */}
            <div className="text-center mb-5">
              <BsShieldLock size={48} className="text-primary mb-3" />
              <h1 className="fw-bold mb-3" style={{ fontSize: "2.5rem" }}>
                Inovatech
              </h1>
              <p className="lead opacity-75" style={{ fontSize: "1.25rem" }}>
                Project Management & Reporting System
              </p>
            </div>

            {/* Feature Cards - Dashboard Style */}
            <div className="row g-3 mb-5">
              {[
                {
                  icon: <BsFolder className="text-primary" size={20} />,
                  title: "Project Tracking",
                  desc: "Real-time progress monitoring",
                },
                {
                  icon: <BsPeople className="text-success" size={20} />,
                  title: "Team Collaboration",
                  desc: "Seamless team coordination",
                },
                {
                  icon: <BsClock className="text-warning" size={20} />,
                  title: "Time Management",
                  desc: "Efficient task scheduling",
                },
                {
                  icon: <BsCheckCircle className="text-info" size={20} />,
                  title: "Automated Reports",
                  desc: "Weekly progress insights",
                },
              ].map((feature, index) => (
                <div key={index} className="col-6">
                  <div
                    className="p-3 rounded h-100"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div className="d-flex align-items-start">
                      <div className="me-3 mt-1">{feature.icon}</div>
                      <div>
                        <h6
                          className="fw-semibold mb-1"
                          style={{ fontSize: "0.9rem" }}
                        >
                          {feature.title}
                        </h6>
                        <p
                          className="text-muted mb-0"
                          style={{ fontSize: "0.8rem" }}
                        >
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial/Stats */}
            <div className="text-center">
              <div className="row g-4">
                <div className="col-4">
                  <div>
                    <h4 className="fw-bold text-primary mb-1">100+</h4>
                    <small className="opacity-75">Active Projects</small>
                  </div>
                </div>
                <div className="col-4">
                  <div>
                    <h4 className="fw-bold text-primary mb-1">500+</h4>
                    <small className="opacity-75">Team Members</small>
                  </div>
                </div>
                <div className="col-4">
                  <div>
                    <h4 className="fw-bold text-primary mb-1">99%</h4>
                    <small className="opacity-75">Satisfaction</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style>
            {`
              @keyframes float {
                0%, 100% { transform: translateY(0px) scale(1); }
                50% { transform: translateY(-10px) scale(1.05); }
              }
            `}
          </style>
        </Col>

        {/* Right Side - Login Form (50%) */}
        <Col
          md={6}
          className="d-flex align-items-center justify-content-center p-5 bg-light"
          style={{ minHeight: "100vh" }}
        >
          <div className="w-100" style={{ maxWidth: "400px" }}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <Card.Title
                    className="fw-bold mb-2 text-dark"
                    style={{ fontSize: "1.5rem" }}
                  >
                    {isSignUp ? "Create Account" : "Welcome Back"}
                  </Card.Title>
                  <p className="text-muted mb-0">
                    {isSignUp
                      ? "Get started with your account"
                      : "Sign in to continue to your dashboard"}
                  </p>
                </div>

                {error && (
                  <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setError(null)}
                    className="border-0 rounded-3 mb-3"
                  >
                    <div className="d-flex align-items-center">
                      <i className="fas fa-exclamation-circle me-2"></i>
                      <span>{error}</span>
                    </div>
                  </Alert>
                )}

                {message && (
                  <Alert
                    variant="success"
                    dismissible
                    onClose={() => setMessage(null)}
                    className="border-0 rounded-3 mb-3"
                  >
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle me-2"></i>
                      <span>{message}</span>
                    </div>
                  </Alert>
                )}

                {/* Google Sign In */}
                <Button
                  variant="outline-primary"
                  className="w-100 mb-3 py-2 fw-semibold d-flex align-items-center justify-content-center"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading}
                  style={{
                    borderRadius: "8px",
                    border: "2px solid #0d6efd",
                  }}
                >
                  {googleLoading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <BsGoogle className="me-2" />
                  )}
                  {isSignUp ? "Sign up with Google" : "Sign in with Google"}
                </Button>

                <div className="position-relative text-center my-3">
                  <hr className="my-4" />
                  <span
                    className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted"
                    style={{ fontSize: "0.9rem" }}
                  >
                    Or continue with email
                  </span>
                </div>

                <Form onSubmit={handleAuth}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold text-dark">
                      Email Address
                    </Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "2px solid #e9ecef",
                        transition: "all 0.2s ease",
                      }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold text-dark">
                      Password
                    </Form.Label>
                    <div style={{ position: "relative" }}>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={6}
                        style={{
                          padding: "12px 48px 12px 16px",
                          borderRadius: "8px",
                          border: "2px solid #e9ecef",
                          transition: "all 0.2s ease",
                        }}
                      />
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          backgroundColor: "transparent",
                          color: "#6c757d",
                          padding: "4px",
                        }}
                      >
                        {showPassword ? <BsEyeSlash /> : <BsEye />}
                      </Button>
                    </div>
                    {!isSignUp && (
                      <div className="text-end mt-2">
                        <Button
                          variant="link"
                          className="p-0 text-decoration-none text-primary"
                          style={{ fontSize: "0.875rem" }}
                        >
                          Forgot password?
                        </Button>
                      </div>
                    )}
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 py-2 fw-semibold d-flex align-items-center justify-content-center"
                    disabled={loading}
                    style={{
                      borderRadius: "8px",
                      fontSize: "1rem",
                      border: "none",
                      boxShadow: "0 2px 8px rgba(11, 94, 215, 0.3)",
                      background:
                        "linear-gradient(135deg, #0b5ed7 0%, #0a58ca 100%)",
                      height: "48px",
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        {isSignUp ? "Creating Account..." : "Signing In..."}
                      </>
                    ) : (
                      <>
                        {isSignUp ? "Create Account" : "Sign In"}
                        <BsArrowRight className="ms-2" size={16} />
                      </>
                    )}
                  </Button>
                </Form>

                <div className="text-center mt-4 pt-3 border-top">
                  <span className="text-muted me-2">
                    {isSignUp
                      ? "Already have an account?"
                      : "Don't have an account?"}
                  </span>
                  <Button
                    variant="link"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="p-0 fw-semibold text-decoration-none text-primary"
                    style={{ fontSize: "0.9rem" }}
                  >
                    {isSignUp ? "Sign in" : "Sign up"}
                  </Button>
                </div>
              </Card.Body>
            </Card>

            {/* Footer */}
            <div className="text-center mt-4">
              <small className="text-muted">
                © 2024 Inovatech PMRS. All rights reserved.
              </small>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
  
};

export default TransitionLogin;
