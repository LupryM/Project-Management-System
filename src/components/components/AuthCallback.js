// components/AuthCallback.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Spinner, Alert, Container } from 'react-bootstrap';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('Verifying credentials...');
        
        // Get the session from the URL parameters
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (session) {
          setStatus('Authentication successful! Redirecting...');
          
          // Wait a moment before redirecting so user sees success message
          setTimeout(() => {
            // Change '/dashboard' to wherever you want users to land after login
            navigate('/dashboard', { replace: true });
          }, 1000);
        } else {
          // No session found, check if there's a user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) throw userError;
          
          if (user) {
            setStatus('Authentication successful! Redirecting...');
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1000);
          } else {
            throw new Error('No session or user found after authentication');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'An error occurred during authentication');
        
        // Redirect back to login after showing error
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="text-center" style={{ maxWidth: '400px' }}>
        {error ? (
          <>
            <Alert variant="danger" className="border-0 rounded-3">
              <i className="fas fa-exclamation-circle me-2"></i>
              <strong>Authentication Error</strong>
              <p className="mb-0 mt-2">{error}</p>
            </Alert>
            <p className="text-muted">Redirecting to login page...</p>
          </>
        ) : (
          <>
            <Spinner 
              animation="border" 
              role="status" 
              className="mb-3"
              style={{ 
                width: '3rem', 
                height: '3rem',
                color: '#0d6efd'
              }}
            />
            <h5 className="mb-2">{status}</h5>
            <p className="text-muted">Please wait...</p>
          </>
        )}
      </div>
    </Container>
  );
};

export default AuthCallback;