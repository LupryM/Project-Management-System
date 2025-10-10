
import React, { useState } from "react";
import { Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    
    setEmailTouched(true);
    setPasswordTouched(true);

    // Enhanced validation with specific messages
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (error) throw error;
        
        setMessage("Check your email for the confirmation link!");
        // Clear form on successful signup
        setEmail("");
        setPassword("");
        setEmailTouched(false);
        setPasswordTouched(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) throw error;
        
        setMessage("Login successful! Redirecting...");
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
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      setError(error.message || "An error occurred during Google authentication");
      setGoogleLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setMessage(null);
    setEmailTouched(false);
    setPasswordTouched(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card style={{ width: "26rem", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }} className="mx-auto border-0">
      <Card.Body className="p-4">
        <div className="text-center mb-4">
          <Card.Title className="fw-bold mb-2" style={{ fontSize: "1.75rem", color: "#212529" }}>
            {isSignUp ? "Create Your Account" : "Welcome Back"}
          </Card.Title>
          <p style={{ color: "#6c757d" }}>
            {isSignUp ? "Sign up to get started" : "Sign in to your account"}
          </p>
        </div>

        {error && (
          <Alert 
            variant="danger" 
            dismissible 
            onClose={() => setError(null)}
            className="border-0 rounded-3"
            style={{ backgroundColor: "#f8d7da", color: "#842029" }}
          >
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        {message && (
          <Alert 
            variant="success" 
            dismissible 
            onClose={() => setMessage(null)}
            className="border-0 rounded-3"
            style={{ backgroundColor: "#d1e7dd", color: "#0f5132" }}
          >
            <i className="fas fa-check-circle me-2"></i>
            {message}
          </Alert>
        )}

        <Form onSubmit={handleAuth} noValidate>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold" style={{ color: "#212529" }}>Email Address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              required
              disabled={loading}
              style={{ 
                padding: "12px 16px",
                borderRadius: "8px",
                border: `2px solid ${
                  emailTouched && email 
                    ? isValidEmail(email) ? "#198754" : "#dc3545"
                    : "#dee2e6"
                }`,
                transition: "all 0.2s ease",
                color: "#212529"
              }}
            />
            {emailTouched && email && !isValidEmail(email) && (
              <div style={{ color: "#dc3545" }} className="d-flex align-items-center mt-1">
                <i className="fas fa-exclamation-triangle me-1" style={{ fontSize: "0.8rem" }}></i>
                <small>Please enter a valid email address</small>
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold" style={{ color: "#212529" }}>Password</Form.Label>
            <div style={{ position: "relative" }}>
              <Form.Control
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                required
                disabled={loading}
                minLength={6}
                style={{ 
                  padding: "12px 48px 12px 16px",
                  borderRadius: "8px",
                  border: `2px solid ${
                    passwordTouched && password 
                      ? password.length >= 6 ? "#198754" : "#dc3545"
                      : "#dee2e6"
                  }`,
                  transition: "all 0.2s ease",
                  color: "#212529"
                }}
              />
              <Button
                type="button"
                variant="link"
                onClick={togglePasswordVisibility}
                disabled={loading}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  backgroundColor: "transparent",
                  padding: "4px 8px",
                  zIndex: 5,
                  color: "#212529",
                  fontSize: "1.1rem"
                }}
              >
                <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
              </Button>
            </div>
            {isSignUp ? (
              <div 
                className="d-flex align-items-center mt-1" 
                style={{ 
                  color: passwordTouched && password.length < 6 ? "#dc3545" : "#6c757d" 
                }}
              >
                <i className={`fas ${
                  passwordTouched && password.length >= 6 
                    ? "fa-check" 
                    : "fa-info-circle"
                } me-1`} style={{ 
                  fontSize: "0.8rem",
                  color: passwordTouched && password.length >= 6 ? "#198754" : "inherit"
                }}></i>
                <small>Password must be at least 6 characters long</small>
              </div>
            ) : (
              <div className="text-end mt-2">
                <Button 
                  variant="link" 
                  className="p-0 text-decoration-none"
                  style={{ color: "#0d6efd", fontSize: "0.875rem" }}
                >
                  Forgot password?
                </Button>
              </div>
            )}
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            className="w-100 mb-3 py-2 fw-semibold"
            disabled={loading}
            style={{
              borderRadius: "8px",
              fontSize: "1rem",
              backgroundColor: "#0d6efd",
              border: "none",
              boxShadow: "0 2px 4px rgba(13, 110, 253, 0.3)",
              color: "#ffffff"
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
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="position-relative text-center mb-3">
            <hr className="my-4" style={{ borderColor: "#dee2e6" }} />
            <span 
              className="position-absolute top-50 start-50 translate-middle bg-white px-3"
              style={{ fontSize: "0.9rem", color: "#6c757d" }}
            >
              Or continue with
            </span>
          </div>

          <Button
            variant="outline-danger"
            className="w-100 mb-4 py-2 fw-semibold"
            onClick={handleGoogleAuth}
            disabled={googleLoading || loading}
            style={{
              borderRadius: "8px",
              border: "2px solid #dc3545",
              fontSize: "1rem",
              color: "#dc3545",
              backgroundColor: "transparent"
            }}
          >
            {googleLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Redirecting...
              </>
            ) : (
              <>
                <i className="fab fa-google me-2"></i>
                {isSignUp ? "Sign up with Google" : "Sign in with Google"}
              </>
            )}
          </Button>

          <div className="text-center pt-3 border-top">
            <span style={{ color: "#6c757d" }} className="me-2">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </span>
            <Button
              variant="link"
              onClick={toggleMode}
              className="p-0 fw-semibold text-decoration-none"
              style={{ color: "#0d6efd" }}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default LoginForm;