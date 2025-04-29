import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  PencilSquareIcon, 
  TrashIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import './AgentDetailPage.css';

const AgentDetailPage = () => {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Base URL for the API
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://call-analyzer-api.onrender.com';

  useEffect(() => {
    const fetchUserAndAgent = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          setError('Authentication token missing');
          setLoading(false);
          return;
        }
        
        // Get current user
        const userResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const user = userResponse.data.user;
        setCurrentUser(user);
        
        // Get user's organization(s)
        if (user.organizations && user.organizations.length > 0) {
          // Set the current organization to the first one by default
          const firstOrg = user.organizations[0];
          setCurrentOrganization(firstOrg);
          
          // Fetch agent details
          await fetchAgentDetails(firstOrg, token);
        } else {
          setError('User has no associated organizations');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user data');
        setLoading(false);
      }
    };
    
    fetchUserAndAgent();
  }, [id, API_BASE_URL]);

  const fetchAgentDetails = async (organization, token) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get organization ID
      const orgId = organization._id || organization.id;
      
      // Create headers configuration with organization context
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': orgId,
          'x-organization-name': organization.name || 'Unknown',
          'x-organization-is-master': (organization.isMaster || currentUser?.isMasterAdmin) ? 'true' : 'false'
        }
      };
      
      console.log(`Fetching agent details for ID: ${id}`);
      
      const response = await axios.get(`${API_BASE_URL}/api/agents/${id}`, config);
      
      if (!response.data || !response.data.agent) {
        throw new Error('Invalid response format');
      }

      setAgent(response.data.agent);
    } catch (err) {
      console.error('Error fetching agent details:', err);
      
      let errorMessage = 'Failed to load agent details';
      
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = 'Agent not found';
        } else if (err.response.status === 401) {
          errorMessage = 'Authentication error: Please log in again';
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to access this agent';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getScoreColorClass = (score) => {
    if (!score && score !== 0) return '';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderScoreOrNA = (score) => {
    if (!score && score !== 0) return 'N/A';
    return score.toFixed(1);
  };

  if (loading) {
    return (
      <div className="loading-indicator">
        <div className="spinner"></div>
        <p>Loading agent details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/agents" className="back-button">
          <ArrowLeftIcon width={16} height={16} />
          Back to Agents
        </Link>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="not-found-container">
        <h2>Agent Not Found</h2>
        <p>The agent you're looking for doesn't exist or you don't have permission to view it.</p>
        <Link to="/agents" className="back-button">
          <ArrowLeftIcon width={16} height={16} />
          Back to Agents
        </Link>
      </div>
    );
  }

  // Get organization name
  let orgName = '';
  if (typeof agent.organizationId === 'object' && agent.organizationId?.name) {
    orgName = agent.organizationId.name;
  }

  // Get performance metrics
  const performanceMetrics = agent.performanceMetrics?.currentPeriod?.averageScores || {};
  const overallScore = performanceMetrics.overallScore;

  return (
    <div className="agent-detail-container">
      <div className="agent-detail-header">
        <Link to="/agents" className="back-button">
          <ArrowLeftIcon width={16} height={16} />
          Back to Agents
        </Link>
        
        <div className="agent-actions">
          <Link to={`/agents/${agent._id}/edit`} className="action-button edit">
            <PencilSquareIcon width={16} height={16} />
            Edit Agent
          </Link>
        </div>
      </div>
      
      <div className="agent-detail-card">
        <div className="agent-info-header">
          <h1>{`${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unnamed Agent'}</h1>
          
          {agent.status && (
            <span className={`status-badge ${agent.status.toLowerCase()}`}>
              {agent.status}
            </span>
          )}
        </div>
        
        <div className="agent-basic-info">
          <div className="info-group">
            <h3>Basic Information</h3>
            <div className="info-grid">
              {agent.email && (
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{agent.email}</span>
                </div>
              )}
              
              {agent.phone && (
                <div className="info-item">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{agent.phone}</span>
                </div>
              )}
              
              {agent.position && (
                <div className="info-item">
                  <span className="info-label">Position</span>
                  <span className="info-value">{agent.position}</span>
                </div>
              )}
              
              {agent.department && (
                <div className="info-item">
                  <span className="info-label">Department</span>
                  <span className="info-value">{agent.department}</span>
                </div>
              )}
              
              {agent.externalId && (
                <div className="info-item">
                  <span className="info-label">External ID</span>
                  <span className="info-value">{agent.externalId}</span>
                </div>
              )}
              
              <div className="info-item">
                <span className="info-label">Organization</span>
                <span className="info-value">{orgName || 'Unknown'}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Created</span>
                <span className="info-value">{formatDate(agent.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {performanceMetrics && Object.keys(performanceMetrics).length > 0 && (
          <div className="agent-performance">
            <div className="info-group">
              <h3>Performance Metrics</h3>
              
              {overallScore !== undefined && (
                <div className="overall-score">
                  <span className="score-label">Overall Score</span>
                  <span className={`score-value ${getScoreColorClass(overallScore)}`}>
                    {renderScoreOrNA(overallScore)}/100
                  </span>
                </div>
              )}
              
              <div className="metrics-grid">
                <div className="metric-detail">
                  <span className="metric-label">Customer Service</span>
                  <span className={`metric-value ${getScoreColorClass(performanceMetrics.customerService)}`}>
                    {renderScoreOrNA(performanceMetrics.customerService)}
                  </span>
                </div>
                
                <div className="metric-detail">
                  <span className="metric-label">Product Knowledge</span>
                  <span className={`metric-value ${getScoreColorClass(performanceMetrics.productKnowledge)}`}>
                    {renderScoreOrNA(performanceMetrics.productKnowledge)}
                  </span>
                </div>
                
                <div className="metric-detail">
                  <span className="metric-label">Process Efficiency</span>
                  <span className={`metric-value ${getScoreColorClass(performanceMetrics.processEfficiency)}`}>
                    {renderScoreOrNA(performanceMetrics.processEfficiency)}
                  </span>
                </div>
                
                <div className="metric-detail">
                  <span className="metric-label">Problem Solving</span>
                  <span className={`metric-value ${getScoreColorClass(performanceMetrics.problemSolving)}`}>
                    {renderScoreOrNA(performanceMetrics.problemSolving)}
                  </span>
                </div>
                
                <div className="metric-detail">
                  <span className="metric-label">Call Count</span>
                  <span className="metric-value">
                    {agent.performanceMetrics?.currentPeriod?.callCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Additional sections can be added here for call history, detailed analytics, etc. */}
        
      </div>
    </div>
  );
};

export default AgentDetailPage; 