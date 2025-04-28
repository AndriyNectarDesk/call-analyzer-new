import React from 'react';
import { Row, Col, Card, Table, Badge } from 'react-bootstrap';

const AgentPerformanceDashboard = ({ agents, loading, onSelectAgent }) => {
  // Helper function to determine score class based on score value
  const getScoreClass = (score) => {
    if (!score && score !== 0) return '';
    if (score >= 90) return 'score-excellent';
    if (score >= 80) return 'score-good';
    if (score >= 70) return 'score-average';
    return 'score-below-average';
  };

  // Generate summary stats
  const getSummaryStats = () => {
    if (!agents || agents.length === 0) return null;

    const totalAgents = agents.length;
    let totalScore = 0;
    let topPerformer = null;
    let mostCalls = null;
    let countAbove80 = 0;
    let countBelow70 = 0;

    agents.forEach(agent => {
      const overallScore = agent.performanceMetrics?.currentPeriod?.averageScores?.overallScore;
      const callCount = agent.performanceMetrics?.currentPeriod?.callCount || 0;
      
      if (overallScore) {
        totalScore += overallScore;
        
        if (!topPerformer || overallScore > topPerformer.score) {
          topPerformer = { 
            name: agent.name, 
            score: overallScore,
            id: agent._id 
          };
        }
        
        if (overallScore >= 80) countAbove80++;
        if (overallScore < 70) countBelow70++;
      }
      
      if (!mostCalls || callCount > mostCalls.count) {
        mostCalls = { 
          name: agent.name, 
          count: callCount,
          id: agent._id
        };
      }
    });

    return {
      totalAgents,
      averageScore: totalScore / totalAgents,
      topPerformer,
      mostCalls,
      countAbove80,
      countBelow70
    };
  };

  const summaryStats = getSummaryStats();

  // Render loading state
  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  // Render empty state
  if (!agents || agents.length === 0) {
    return (
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Body className="text-center">
              <h3>No agent data available</h3>
              <p>There are no agents with performance metrics for the selected period.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <div className="agent-dashboard">
      {/* Summary metrics row */}
      {summaryStats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="metrics-card">
              <Card.Body>
                <div className="metric-header">
                  <h3>Average Score</h3>
                </div>
                <div className="metric-value">
                  {summaryStats.averageScore.toFixed(1)}%
                </div>
                <div className="metric-description">
                  Across {summaryStats.totalAgents} agents
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="metrics-card">
              <Card.Body>
                <div className="metric-header">
                  <h3>Top Performer</h3>
                </div>
                <div className="metric-value">
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    onSelectAgent(summaryStats.topPerformer.id);
                  }}>
                    {summaryStats.topPerformer.name}
                  </a>
                </div>
                <div className="metric-description">
                  Score: {summaryStats.topPerformer.score.toFixed(1)}%
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="metrics-card">
              <Card.Body>
                <div className="metric-header">
                  <h3>Most Active</h3>
                </div>
                <div className="metric-value">
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    onSelectAgent(summaryStats.mostCalls.id);
                  }}>
                    {summaryStats.mostCalls.name}
                  </a>
                </div>
                <div className="metric-description">
                  Calls: {summaryStats.mostCalls.count}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="metrics-card">
              <Card.Body>
                <div className="metric-header">
                  <h3>Agent Distribution</h3>
                </div>
                <div className="metric-value">
                  <span className="text-success">{summaryStats.countAbove80}</span> / <span className="text-danger">{summaryStats.countBelow70}</span>
                </div>
                <div className="metric-description">
                  Above 80% / Below 70%
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Agent list table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h3 className="mb-0">Agent Performance Rankings</h3>
            </Card.Header>
            <Card.Body style={{ padding: 0 }}>
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Agent</th>
                    <th>Department</th>
                    <th>Call Count</th>
                    <th>Overall Score</th>
                    <th>Customer Service</th>
                    <th>Product Knowledge</th>
                    <th>Process Efficiency</th>
                    <th>Problem Solving</th>
                    <th>Avg. Call Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent, index) => {
                    const metrics = agent.performanceMetrics?.currentPeriod;
                    const scores = metrics?.averageScores || {};
                    
                    return (
                      <tr 
                        key={agent._id} 
                        className="agent-list-item"
                        onClick={() => onSelectAgent(agent._id)}
                      >
                        <td>{index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <strong>{agent.name}</strong>
                            {agent.status !== 'active' && (
                              <Badge 
                                bg={agent.status === 'training' ? 'info' : 'warning'} 
                                className="ms-2"
                              >
                                {agent.status}
                              </Badge>
                            )}
                          </div>
                          <small className="text-muted">{agent.position || 'N/A'}</small>
                        </td>
                        <td>{agent.department || 'N/A'}</td>
                        <td>{metrics?.callCount || 0}</td>
                        <td>
                          <div className={`agent-score-card ${getScoreClass(scores.overallScore)}`}>
                            {scores.overallScore ? scores.overallScore.toFixed(1) + '%' : 'N/A'}
                          </div>
                        </td>
                        <td>{scores.customerService ? scores.customerService.toFixed(1) + '%' : 'N/A'}</td>
                        <td>{scores.productKnowledge ? scores.productKnowledge.toFixed(1) + '%' : 'N/A'}</td>
                        <td>{scores.processEfficiency ? scores.processEfficiency.toFixed(1) + '%' : 'N/A'}</td>
                        <td>{scores.problemSolving ? scores.problemSolving.toFixed(1) + '%' : 'N/A'}</td>
                        <td>
                          {metrics?.avgCallDuration 
                            ? `${Math.floor(metrics.avgCallDuration / 60)}m ${Math.round(metrics.avgCallDuration % 60)}s` 
                            : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AgentPerformanceDashboard; 