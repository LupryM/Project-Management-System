// components/ui/LoginForm.js
import React, { useState } from "react";
import { Card, Form, Button, Alert } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);

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
        });

        if (error) {
          throw error;
        } else {
          const userId = data.user.id;
          console.log("User ID:", userId);
        }
        setMessage("Check your email for the confirmation link!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          throw error;
        } else {
          const userId = data.user.id;
          console.log("User ID:", userId);
          //console.log("User ID222:", session.user.id);
        }
        // The auth state change will be handled by App.js
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });

      if (error) throw error;
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: "24rem" }}>
      <Card.Body>
        <Card.Title className="text-center mb-4">
          {isSignUp ? "Create Account" : "Login"}
        </Card.Title>

        {error && <Alert variant="danger">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

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
            />
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            className="w-100 mb-2"
            disabled={loading}
          >
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Login"}
          </Button>

          <Button
            variant="outline-secondary"
            className="w-100 mb-3"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            {isSignUp ? "Sign up with Google" : "Login with Google"}
          </Button>

          <div className="text-center">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsSignUp(!isSignUp);
              }}
              style={{ cursor: "pointer" }}
            >
              {isSignUp
                ? "Already have an account? Login"
                : "Don't have an account? Sign up"}
            </a>
          </div>

          <div className="text-center mt-2">
            <a href="#forgot-password" style={{ cursor: "pointer" }}>
              Forgot password?
            </a>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default LoginForm;
