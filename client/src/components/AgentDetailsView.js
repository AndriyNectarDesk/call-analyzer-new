import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, ListGroup, Table } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import axios from '../axiosConfig';

const AgentDetailsView = ({ agentId, dateRange }) => {
  const [agent, setAgent] = useState(null);
  const [recentTranscripts, setRecentTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (agentId) {
      fetchAgentDetails();
      fetchRecentTranscripts();
    }
  }, [agentId, dateRange]);

  const fetchAgentDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/agents/${agentId}`);
      setAgent(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching agent details:', err);
      setError('Failed to load agent details.');
      setLoading(false);
    }
  };

  const fetchRecentTranscripts = async () => {
    try {
      const response = await axios.get(`/api/agents/${agentId}/transcripts`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          limit: 5
        }
      });
      setRecentTranscripts(response.data.transcripts || []);
    } catch (err) {
      console.error('Error fetching recent transcripts:', err);
      // Don't set error state here as we want to show agent details even if transcripts fail
    }
  };

  const getScoreColorClass = (score) => {
    if (!score && score !== 0) return '';
    if (score >= 90) return 'bg-success';
    if (score >= 80) return 'bg-info';
    if (score >= 70) return 'bg-warning';
    return 'bg-danger';
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return '??';
    return `${firstName ? firstName[0] : ''}${lastName ? lastName[0] : ''}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const getAgentStatus = (status) => {
    const statusMap = {
      active: { text: 'Active', variant: 'success' },
      inactive: { text: 'Inactive', variant: 'secondary' },
      training: { text: 'In Training', variant: 'info' },
      terminated: { text: 'Terminated', variant: 'danger' }
    };
    
    return statusMap[status] || { text: status, variant: 'secondary' };
  };

  // Render loading state
  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="alert alert-danger">{error}</div>
    );
  }

  // Render empty state
  if (!agent) {
    return (
      <Card>
        <Card.Body className="text-center">
          <h3>No agent selected</h3>
          <p>Please select an agent to view their details.</p>
        </Card.Body>
      </Card>
    );
  }

  const currentMetrics = agent.performanceMetrics?.currentPeriod || {};
  const scores = currentMetrics.averageScores || {};

  // Prepare data for score pie chart
  const scoreData = [
    { name: 'Customer Service', value: scores.customerService || 0 },
    { name: 'Product Knowledge', value: scores.productKnowledge || 0 },
    { name: 'Process Efficiency', value: scores.processEfficiency || 0 },
    { name: 'Problem Solving', value: scores.problemSolving || 0 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="agent-details">
      <Row className="mb-4">
        <Col>
          <div className="agent-detail-header">
            <div className="avatar">
              {getInitials(agent.firstName, agent.lastName)}
            </div>
            <div className="agent-info">
              <h2>{agent.firstName} {agent.lastName}</h2>
              <p>
                {agent.position && <span>{agent.position}</span>}
                {agent.department && <span> • {agent.department}</span>}
                {agent.status && (
                  <Badge bg={getAgentStatus(agent.status).variant} className="ms-2">
                    {getAgentStatus(agent.status).text}
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Card>
            <Card.Header>
              <h3 className="mb-0">Agent Information</h3>
            </Card.Header>
            <ListGroup variant="flush">
              {agent.email && (
                <ListGroup.Item>
                  <strong>Email:</strong> {agent.email}
                </ListGroup.Item>
              )}
              {agent.phone && (
                <ListGroup.Item>
                  <strong>Phone:</strong> {agent.phone}
                </ListGroup.Item>
              )}
              {agent.externalId && (
                <ListGroup.Item>
                  <strong>External ID:</strong> {agent.externalId}
                </ListGroup.Item>
              )}
              {agent.hireDate && (
                <ListGroup.Item>
                  <strong>Hire Date:</strong> {new Date(agent.hireDate).toLocaleDateString()}
                </ListGroup.Item>
              )}
              {agent.primaryTeam && (
                <ListGroup.Item>
                  <strong>Primary Team:</strong> {agent.primaryTeam}
                </ListGroup.Item>
              )}
              {agent.skills && agent.skills.length > 0 && (
                <ListGroup.Item>
                  <strong>Skills:</strong>
                  <div className="mt-1">
                    {agent.skills.map((skill, index) => (
                      <Badge key={index} bg="info" className="me-1 mb-1">{skill}</Badge>
                    ))}
                  </div>
                </ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h3 className="mb-0">Performance Summary</h3>
            </Card.Header>
            <Card.Body>
              <div className="text-center mb-3">
                <h4>Overall Score</h4>
                <div className={`agent-score-card ${getScoreColorClass(scores.overallScore)}`} style={{ fontSize: '24px' }}>
                  {scores.overallScore ? `${scores.overallScore.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              
              <div className="mb-3">
                <h5>Call Statistics</h5>
                <Row>
                  <Col xs={6}>
                    <div className="stat-box">
                      <div className="stat-label">Calls</div>
                      <div className="stat-value">{currentMetrics.callCount || 0}</div>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="stat-box">
                      <div className="stat-label">Avg Duration</div>
                      <div className="stat-value">{formatDuration(currentMetrics.avgCallDuration)}</div>
                    </div>
                  </Col>
                </Row>
              </div>
              
              <div style={{ height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scoreData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      labelLine={false}
                    >
                      {scoreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="strengths-improvements">
            <Card.Header>
              <h3 className="mb-0">Strengths & Areas for Improvement</h3>
            </Card.Header>
            <Card.Body>
              {agent.performanceMetrics?.historical && agent.performanceMetrics.historical.length > 0 ? (
                <>
                  <div className="mb-4">
                    <h5 className="text-success">Top Strengths</h5>
                    <ul className="strengths-list">
                      {agent.performanceMetrics.historical[0].commonStrengths?.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      )) || <li>No recorded strengths</li>}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-warning">Areas for Improvement</h5>
                    <ul className="improvements-list">
                      {agent.performanceMetrics.historical[0].commonAreasForImprovement?.map((area, index) => (
                        <li key={index}>{area}</li>
                      )) || <li>No recorded areas for improvement</li>}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-center">No historical data available to analyze strengths and areas for improvement.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h3 className="mb-0">Recent Calls</h3>
            </Card.Header>
            <Card.Body style={{ padding: 0 }}>
              {recentTranscripts.length > 0 ? (
                <Table hover responsive>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Call Type</th>
                      <th>Duration</th>
                      <th>Score</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTranscripts.map(transcript => (
                      <tr key={transcript._id}>
                        <td>{new Date(transcript.createdAt).toLocaleString()}</td>
                        <td>{transcript.callType?.name || 'N/A'}</td>
                        <td>{formatDuration(transcript.callDetails?.duration)}</td>
                        <td>
                          <Badge
                            bg={getScoreColorClass(transcript.analysis?.scorecard?.overallScore)}
                          >
                            {transcript.analysis?.scorecard?.overallScore 
                              ? `${transcript.analysis.scorecard.overallScore.toFixed(1)}%` 
                              : 'N/A'}
                          </Badge>
                        </td>
                        <td>
                          {transcript.notes 
                            ? transcript.notes.substring(0, 50) + (transcript.notes.length > 50 ? '...' : '') 
                            : 'No notes'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center p-3">
                  <p>No recent call records found for this agent.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AgentDetailsView; 