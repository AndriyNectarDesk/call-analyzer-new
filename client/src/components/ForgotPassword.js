import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/appleDesign.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await axios.post(`${apiUrl}/api/auth/forgot-password`, { 
        email 
      });
      
      setSuccessMessage('If your email exists in our system, you will receive password reset instructions shortly.');
      setEmail(''); // Clear the form
    } catch (err) {
      console.error('Error requesting password reset:', err);
      setError('Failed to process your request. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>AI Nectar Desk</h1>
          <h2>Reset Password</h2>
          <p className="login-description">
            Enter your email address and we will send you instructions to reset your password.
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
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading || successMessage}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="button login-button"
            disabled={isLoading || successMessage}
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                <span>Sending...</span>
              </>
            ) : (
              'Send Reset Link'
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

export default ForgotPassword; 