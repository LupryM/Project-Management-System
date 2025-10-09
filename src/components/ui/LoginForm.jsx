// components/ui/LoginForm.js
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

  const handleAuth = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setError("Please fill in all fields");
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
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) throw error;
        
        // Login successful - auth state change handled by App.js
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
  };

  return (
    <Card style={{ width: "24rem" }} className="mx-auto">
      <Card.Body>
        <Card.Title className="text-center mb-4">
          {isSignUp ? "Create Account" : "Login"}
        </Card.Title>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {message && <Alert variant="success" dismissible onClose={() => setMessage(null)}>{message}</Alert>}

        <Form onSubmit={handleAuth}>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
            {isSignUp && (
              <Form.Text className="text-muted">
                Password must be at least 6 characters long
              </Form.Text>
            )}
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            className="w-100 mb-2"
            disabled={loading}
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
                Processing...
              </>
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Login"
            )}
          </Button>

          <div className="text-center mb-3">
            <span className="text-muted">OR</span>
          </div>

          <Button
            variant="outline-danger"
            className="w-100 mb-3"
            onClick={handleGoogleAuth}
            disabled={googleLoading || loading}
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
                {isSignUp ? "Sign up with Google" : "Login with Google"}
              </>
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={toggleMode}
              className="p-0"
            >
              {isSignUp
                ? "Already have an account? Login"
                : "Don't have an account? Sign up"}
            </Button>
          </div>

          {!isSignUp && (
            <div className="text-center mt-2">
              <Button variant="link" className="p-0">
                Forgot password?
              </Button>
            </div>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
};

export default LoginForm;