import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/appleDesign.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tokenParam = searchParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('No reset token found. Please request a new password reset link.');
    }
  }, [location]);

  const validateForm = () => {
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    if (!token) {
      setError('Invalid reset token');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await axios.post(`${apiUrl}/api/auth/reset-password`, {
        token,
        password
      });
      
      setSuccessMessage('Your password has been reset successfully!');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      console.error('Error resetting password:', err);
      
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to reset password. The token may be invalid or expired.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>AI Nectar Desk</h1>
          <h2>Create New Password</h2>
          <p className="login-description">
            Please enter your new password below.
          </p>
        </div>
        
        {error && (
          <div className="login-error">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input 
              type="password" 
              id="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={isLoading || successMessage || !token}
              minLength={8}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input 
              type="password" 
              id="confirmPassword"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={isLoading || successMessage || !token}
              minLength={8}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="button login-button"
            disabled={isLoading || successMessage || !token}
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                <span>Resetting Password...</span>
              </>
            ) : (
              'Reset Password'
            )}
          </button>
          
          <div className="form-group mt-4 text-center">
            <Link to="/login" className="back-link">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword; 