import React, { useState } from 'react';
import '../styles/appleDesign.css';

const Login = ({ onLogin, logo }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Call the login function passed from parent
      await onLogin(email, password);
      
      // Login successful - parent component will handle redirect
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          {logo ? (
            <img src={logo} alt="Logo" className="login-logo" />
          ) : (
            <h1>AI Nectar Desk</h1>
          )}
          <h2>Sign In</h2>
          <p className="login-description">
            Sign in to your account to access your organization's tools and analytics.
          </p>
        </div>
        
        {error && (
          <div className="login-error">
            {error}
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
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-group">
            <div className="password-label-row">
              <label htmlFor="password">Password</label>
              <a href="/forgot-password" className="forgot-password">
                Forgot Password?
              </a>
            </div>
            <input 
              type="password" 
              id="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="button login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="login-footer">
          <p>
            Don't have an account? <a href="/contact">Contact your administrator</a>
          </p>
        </div>
      </div>
      
      {/* Additional styling */}
      <style jsx>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
          background-color: var(--background-secondary);
        }
        
        .login-card {
          width: 100%;
          max-width: 420px;
          background-color: var(--card-background);
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 32px;
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .login-header {
          text-align: center;
          margin-bottom: 24px;
        }
        
        .login-logo {
          height: 50px;
          margin-bottom: 16px;
        }
        
        .login-header h1 {
          margin-bottom: 8px;
          font-size: 28px;
        }
        
        .login-header h2 {
          margin-bottom: 8px;
          font-size: 24px;
        }
        
        .login-description {
          color: var(--apple-mid-gray);
          margin-top: 8px;
        }
        
        .login-error {
          padding: 12px;
          background-color: rgba(255, 59, 48, 0.1);
          border-radius: var(--border-radius-md);
          color: var(--error-color);
          margin-bottom: 16px;
          font-size: 14px;
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .login-form {
          margin-bottom: 24px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .password-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .forgot-password {
          font-size: 13px;
        }
        
        .login-button {
          width: 100%;
          padding: 12px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 32px;
        }
        
        .login-footer {
          text-align: center;
          font-size: 14px;
          color: var(--apple-mid-gray);
        }
        
        .spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login; 