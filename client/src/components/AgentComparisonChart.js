import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AgentComparisonChart = ({ agents, loading }) => {
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [comparisonMetric, setComparisonMetric] = useState('overallScore');

  useEffect(() => {
    if (!agents || agents.length === 0) return;
    
    // Default to selecting the top 5 agents by overall score
    const topAgents = [...agents]
      .sort((a, b) => {
        const scoreA = a.performanceMetrics?.currentPeriod?.averageScores?.overallScore || 0;
        const scoreB = b.performanceMetrics?.currentPeriod?.averageScores?.overallScore || 0;
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map(agent => agent._id);
    
    setSelectedAgents(topAgents);
  }, [agents]);

  useEffect(() => {
    prepareComparisonData();
  }, [selectedAgents, comparisonMetric]);

  const prepareComparisonData = () => {
    if (!agents || !selectedAgents.length) return;

    const metricLabels = {
      overallScore: 'Overall Score',
      customerService: 'Customer Service',
      productKnowledge: 'Product Knowledge',
      processEfficiency: 'Process Efficiency',
      problemSolving: 'Problem Solving',
      avgCallDuration: 'Avg Call Duration (sec)',
      avgTalkTime: 'Avg Talk Time (sec)',
      callCount: 'Call Count'
    };

    const data = [];

    // Create a data point for each metric
    if (comparisonMetric === 'all') {
      // For all metrics comparison, prepare data for radar chart
      const metricsToCompare = [
        'customerService', 'productKnowledge', 'processEfficiency', 'problemSolving', 'overallScore'
      ];

      metricsToCompare.forEach(metric => {
        const dataPoint = {
          name: metricLabels[metric]
        };

        selectedAgents.forEach(agentId => {
          const agent = agents.find(a => a._id === agentId);
          if (agent) {
            dataPoint[agent.name] = agent.performanceMetrics?.currentPeriod?.averageScores?.[metric] || 0;
          }
        });

        data.push(dataPoint);
      });
    } else {
      // For single metric comparison
      const dataPoint = {
        name: metricLabels[comparisonMetric] || comparisonMetric
      };

      selectedAgents.forEach(agentId => {
        const agent = agents.find(a => a._id === agentId);
        if (agent) {
          let value;
          if (['avgCallDuration', 'avgTalkTime', 'callCount'].includes(comparisonMetric)) {
            value = agent.performanceMetrics?.currentPeriod?.[comparisonMetric] || 0;
          } else {
            value = agent.performanceMetrics?.currentPeriod?.averageScores?.[comparisonMetric] || 0;
          }
          dataPoint[agent.name] = value;
        }
      });

      data.push(dataPoint);
    }

    setComparisonData(data);
  };

  const handleAgentSelection = (e) => {
    const { value, checked } = e.target;
    
    if (checked) {
      setSelectedAgents(prev => [...prev, value]);
    } else {
      setSelectedAgents(prev => prev.filter(id => id !== value));
    }
  };

  const handleMetricChange = (e) => {
    setComparisonMetric(e.target.value);
  };

  // Generate random colors for bars
  const getRandomColor = (index) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', 
      '#d0ed57', '#83a6ed', '#8dd1e1', '#a4506c', '#6ca0dc'
    ];
    return colors[index % colors.length];
  };

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
    <div className="agent-comparison">
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header>
              <h3 className="mb-0">Agent Comparison</h3>
            </Card.Header>
            <Card.Body>
              <div className="comparison-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis 
                      domain={[0, comparisonMetric.includes('Duration') || comparisonMetric.includes('Time') ? 'auto' : 100]} 
                      unit={comparisonMetric.includes('Duration') || comparisonMetric.includes('Time') || comparisonMetric === 'callCount' ? '' : '%'} 
                    />
                    <Tooltip formatter={(value) => [
                      comparisonMetric.includes('Duration') || comparisonMetric.includes('Time') || comparisonMetric === 'callCount' 
                        ? value.toFixed(0) 
                        : value.toFixed(1) + '%',
                      ''
                    ]} />
                    <Legend />
                    {selectedAgents.map((agentId, index) => {
                      const agent = agents.find(a => a._id === agentId);
                      if (!agent) return null;
                      
                      return (
                        <Bar 
                          key={agent._id} 
                          dataKey={agent.name} 
                          fill={getRandomColor(index)} 
                          name={agent.name}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h3 className="mb-0">Comparison Options</h3>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-4">
                  <Form.Label>Select Metric to Compare</Form.Label>
                  <Form.Select value={comparisonMetric} onChange={handleMetricChange}>
                    <option value="overallScore">Overall Score</option>
                    <option value="customerService">Customer Service</option>
                    <option value="productKnowledge">Product Knowledge</option>
                    <option value="processEfficiency">Process Efficiency</option>
                    <option value="problemSolving">Problem Solving</option>
                    <option value="avgCallDuration">Average Call Duration</option>
                    <option value="avgTalkTime">Average Talk Time</option>
                    <option value="callCount">Call Count</option>
                  </Form.Select>
                </Form.Group>
                
                <Form.Group>
                  <Form.Label>Select Agents to Compare (max 5 recommended)</Form.Label>
                  <div className="agent-selection-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {agents.map(agent => (
                      <Form.Check
                        key={agent._id}
                        type="checkbox"
                        id={`agent-${agent._id}`}
                        label={`${agent.name} ${agent.department ? `(${agent.department})` : ''}`}
                        value={agent._id}
                        checked={selectedAgents.includes(agent._id)}
                        onChange={handleAgentSelection}
                        className="mb-2"
                      />
                    ))}
                  </div>
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AgentComparisonChart; 