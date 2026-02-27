import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loading) return; // Prevent multiple submissions
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      login(response.data.access_token, response.data.user);
      toast.success('Welcome back, warrior!');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
      setLoading(false); // Re-enable button on error
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold uppercase tracking-wide text-primary mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              No Nut November War
            </h1>
            <p className="text-sm italic" style={{ color: '#B3B3B3' }}>"Reclaim what was taken from you."</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="mt-1"
                data-testid="login-username-input"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-primary"
                  style={{ color: '#B3B3B3' }}
                  data-testid="toggle-login-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-bold uppercase tracking-wider"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? 'Logging in...' : 'Enter the War'}
            </Button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: '#B3B3B3' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:text-primary-hover font-medium" data-testid="go-to-signup-link">
              Join Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};