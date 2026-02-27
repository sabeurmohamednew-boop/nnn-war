import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('Invalid verification link');
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      await axios.post(`${API}/auth/verify-email`, { token });
      setStatus('success');
      setMessage('Email verified successfully!');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Verification failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
              <h1 className="text-2xl font-bold mb-2">Verifying Email...</h1>
              <p className="text-muted-foreground">Please wait while we verify your email.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-success" data-testid="verify-success-icon" />
              <h1 className="text-2xl font-bold mb-2 text-success">Email Verified!</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Link to="/login">
                <Button className="w-full" data-testid="go-to-login-btn">
                  Go to Login
                </Button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" data-testid="verify-error-icon" />
              <h1 className="text-2xl font-bold mb-2 text-destructive">Verification Failed</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Link to="/signup">
                <Button variant="outline" className="w-full" data-testid="back-to-signup-btn">
                  Back to Signup
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const VerifyEmailPendingPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await axios.post(`${API}/auth/resend-verification`, { email });
      setResent(true);
    } catch (error) {
      console.error('Resend failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Check Your Inbox</h1>
          <p className="text-muted-foreground mb-6">
            We've sent a verification link to your email. Click the link to activate your account.
          </p>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Didn't receive the email?
            </div>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-input rounded-md"
              data-testid="resend-email-input"
            />
            <Button
              onClick={handleResend}
              disabled={loading || !email || resent}
              variant="outline"
              className="w-full"
              data-testid="resend-verification-btn"
            >
              {resent ? 'Email Sent!' : loading ? 'Sending...' : 'Resend Verification Email'}
            </Button>
          </div>

          <Link to="/login" className="block mt-6">
            <Button variant="ghost" className="w-full" data-testid="go-to-login-link">
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};