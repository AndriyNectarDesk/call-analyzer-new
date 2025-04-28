import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from '../axiosConfig';

const AgentHistoricalTrends = ({ agents, loading }) => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('overallScore');
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgent) {
      // Default to the first agent
      setSelectedAgent(agents[0]._id);
    }
  }, [agents]);

  useEffect(() => {
    if (selectedAgent) {
      fetchHistoricalData(selectedAgent);
    }
  }, [selectedAgent]);

  const fetchHistoricalData = async (agentId) => {
    try {
      setLoadingHistorical(true);
      const response = await axios.get(`/api/agents/${agentId}`);
      
      if (response.data.performanceMetrics?.historical) {
        // Sort by date ascending (oldest to newest)
        const sortedData = [...response.data.performanceMetrics.historical]
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        
        setHistoricalData(sortedData);
      } else {
        setHistoricalData([]);
      }
      
      setLoadingHistorical(false);
    } catch (err) {
      console.error('Error fetching agent historical data:', err);
      setError('Failed to load historical data.');
      setLoadingHistorical(false);
    }
  };

  const handleAgentChange = (e) => {
    setSelectedAgent(e.target.value);
  };

  const handleMetricChange = (e) => {
    setSelectedMetric(e.target.value);
  };

  const prepareChartData = () => {
    if (!historicalData || historicalData.length === 0) return [];

    return historicalData.map(period => {
      let metricValue;
      
      if (['avgCallDuration', 'avgTalkTime', 'avgWaitingTime', 'callCount'].includes(selectedMetric)) {
        metricValue = period[selectedMetric];
      } else {
        metricValue = period.averageScores?.[selectedMetric];
      }
      
      return {
        name: period.periodName,
        value: metricValue || 0
      };
    });
  };

  const getMetricLabel = () => {
    const metricLabels = {
      overallScore: 'Overall Score',
      customerService: 'Customer Service',
      productKnowledge: 'Product Knowledge',
      processEfficiency: 'Process Efficiency',
      problemSolving: 'Problem Solving',
      avgCallDuration: 'Average Call Duration',
      avgTalkTime: 'Average Talk Time',
      avgWaitingTime: 'Average Waiting Time',
      callCount: 'Call Count'
    };
    
    return metricLabels[selectedMetric] || selectedMetric;
  };

  const getMetricUnit = () => {
    if (['avgCallDuration', 'avgTalkTime', 'avgWaitingTime'].includes(selectedMetric)) {
      return 'seconds';
    } else if (selectedMetric === 'callCount') {
      return 'calls';
    } else {
      return '%';
    }
  };

  const chartData = prepareChartData();

  // Render loading state for main component
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
    <div className="agent-historical-trends">
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header>
              <h3 className="mb-0">Historical Performance Trends</h3>
            </Card.Header>
            <Card.Body>
              {loadingHistorical ? (
                <div className="loader-container">
                  <div className="loader"></div>
                </div>
              ) : error ? (
                <div className="alert alert-danger">{error}</div>
              ) : historicalData.length === 0 ? (
                <div className="text-center">
                  <p>No historical data available for this agent.</p>
                </div>
              ) : (
                <div className="agent-historical-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60}
                        interval={0}
                      />
                      <YAxis 
                        domain={
                          ['avgCallDuration', 'avgTalkTime', 'avgWaitingTime', 'callCount'].includes(selectedMetric)
                            ? [0, 'auto']
                            : [0, 100]
                        }
                        unit={getMetricUnit() === '%' ? '%' : ''} 
                      />
                      <Tooltip 
                        formatter={(value) => [
                          getMetricUnit() === '%' ? `${value.toFixed(1)}%` : value.toFixed(0),
                          getMetricLabel()
                        ]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        name={getMetricLabel()} 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h3 className="mb-0">Trend Options</h3>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-4">
                  <Form.Label>Select Agent</Form.Label>
                  <Form.Select value={selectedAgent || ''} onChange={handleAgentChange}>
                    {agents.map(agent => (
                      <option key={agent._id} value={agent._id}>
                        {agent.name} {agent.department ? `(${agent.department})` : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group>
                  <Form.Label>Select Metric</Form.Label>
                  <Form.Select value={selectedMetric} onChange={handleMetricChange}>
                    <option value="overallScore">Overall Score</option>
                    <option value="customerService">Customer Service</option>
                    <option value="productKnowledge">Product Knowledge</option>
                    <option value="processEfficiency">Process Efficiency</option>
                    <option value="problemSolving">Problem Solving</option>
                    <option value="avgCallDuration">Average Call Duration</option>
                    <option value="avgTalkTime">Average Talk Time</option>
                    <option value="avgWaitingTime">Average Waiting Time</option>
                    <option value="callCount">Call Count</option>
                  </Form.Select>
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
          {historicalData.length > 0 && (
            <Card className="mt-4">
              <Card.Header>
                <h3 className="mb-0">Trend Insights</h3>
              </Card.Header>
              <Card.Body>
                {(() => {
                  // Calculate trend insights
                  if (chartData.length >= 2) {
                    const firstValue = chartData[0].value;
                    const lastValue = chartData[chartData.length - 1].value;
                    const percentChange = ((lastValue - firstValue) / firstValue) * 100;
                    
                    let trendClass = 'trend-neutral';
                    let trendIcon = '→';
                    
                    if (percentChange > 5) {
                      trendClass = 'trend-up';
                      trendIcon = '↑';
                    } else if (percentChange < -5) {
                      trendClass = 'trend-down';
                      trendIcon = '↓';
                    }
                    
                    // Determine if the trend is good or bad based on the metric
                    const isGoodTrend = 
                      ['avgCallDuration', 'avgWaitingTime'].includes(selectedMetric) 
                        ? percentChange < 0 
                        : percentChange > 0;
                    
                    return (
                      <>
                        <p>
                          <strong>Change over time:</strong> 
                          <span className={trendClass}>
                            {` ${percentChange.toFixed(1)}% ${trendIcon}`}
                          </span>
                        </p>
                        <p>
                          <strong>Assessment:</strong> 
                          {isGoodTrend 
                            ? " This agent is showing improvement in this metric."
                            : " This agent may need additional training or support for this metric."}
                        </p>
                        <p>
                          <strong>First recording:</strong> {chartData[0].name} ({getMetricUnit() === '%' 
                            ? `${chartData[0].value.toFixed(1)}%` 
                            : chartData[0].value.toFixed(0)})
                        </p>
                        <p>
                          <strong>Most recent:</strong> {chartData[chartData.length - 1].name} ({getMetricUnit() === '%' 
                            ? `${chartData[chartData.length - 1].value.toFixed(1)}%` 
                            : chartData[chartData.length - 1].value.toFixed(0)})
                        </p>
                      </>
                    );
                  } else {
                    return <p>Not enough historical data to analyze trends.</p>;
                  }
                })()}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default AgentHistoricalTrends; 