import React, { useState, useEffect } from "react";
import { Form, Button, Alert, Spinner, Card } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import FunWithMamaLogo from "./FUNWITHMAMA.png";
import {
  BsEye,
  BsEyeSlash,
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
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Inject critical CSS for full screen
    const style = document.createElement("style");
    style.textContent = `
      .login-root {
        width: 100vw !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 1000 !important;
      }
      .login-row {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        display: flex !important;
      }
      .login-col {
        flex: 0 0 50% !important;
        padding: 0 !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 100vh !important;
      }
      .login-right-col {
        padding: 2rem !important;
        box-sizing: border-box !important;
      }
      @media (max-width: 767.98px) {
        .login-col {
          flex: 0 0 100% !important;
          min-height: 50vh !important;
        }
        .login-right-col {
          padding: 1rem !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

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

  return (
    <div className="login-root">
      <div className="login-row">
        {/* Left Side - Branding */}
        <div
          className="login-col"
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
            style={{
              maxWidth: "480px",
              width: "100%",
              padding: "2rem",
              zIndex: 2,
              position: "relative",
            }}
          >
            <div className="text-center mb-5">
              <BsShieldLock size={48} className="text-primary mb-3" />
              <h1 className="fw-bold mb-3" style={{ fontSize: "2.5rem" }}>
                Inovatech
              </h1>
              <p className="lead opacity-75" style={{ fontSize: "1.25rem" }}>
                Project Management & Reporting System
              </p>
            </div>

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
                          className="mb-0"
                          style={{
                            fontSize: "0.8rem",
                            color: "#adb5bd",
                          }}
                        >
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) scale(1); }
              50% { transform: translateY(-10px) scale(1.05); }
            }
          `}</style>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-col login-right-col bg-light">
          <div style={{ maxWidth: "400px", width: "100%" }}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4 d-flex flex-column">
                {/* Company Logo - REPLACE WITH YOUR LOGO */}
                <div className="text-center mb-4 flex-shrink-0">
                  {/* PLACEHOLDER: Replace the img src below with your actual logo path */}
                  <img
                    src={FunWithMamaLogo}
                    alt="Fun With Mama"
                    style={{
                      maxWidth: "60%",
                      height: "auto",
                      display: "block",
                      marginLeft: "auto",
                      marginRight: "auto",
                      transform: "translateX(0px)", // adjust this value as needed
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>

                <div className="text-center mb-4 flex-shrink-0">
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
                    className="border-0 rounded-3 mb-3 flex-shrink-0"
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
                    className="border-0 rounded-3 mb-3 flex-shrink-0"
                  >
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle me-2"></i>
                      <span>{message}</span>
                    </div>
                  </Alert>
                )}

                <Form
                  onSubmit={handleAuth}
                  className="flex-grow-1 d-flex flex-column"
                >
                  <Form.Group className="mb-3 flex-shrink-0">
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
                      }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4 flex-shrink-0">
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
                    className="w-100 py-2 fw-semibold d-flex align-items-center justify-content-center flex-shrink-0"
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

                <div className="text-center mt-4 pt-3 border-top flex-shrink-0">
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

            <div className="text-center mt-4">
              <small className="text-muted">
                © 2024 Inovatech PMRS. All rights reserved.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransitionLogin;
