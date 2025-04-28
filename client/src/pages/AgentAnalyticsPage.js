import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import axios from '../axiosConfig';
import '../components/AgentAnalytics.css';
import AgentPerformanceDashboard from '../components/AgentPerformanceDashboard';
import AgentComparisonChart from '../components/AgentComparisonChart';
import AgentHistoricalTrends from '../components/AgentHistoricalTrends';
import AgentDetailsView from '../components/AgentDetailsView';

const AgentAnalyticsPage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [view, setView] = useState('dashboard'); // dashboard, comparison, historical, details

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('You are not authenticated. Please log in first.');
      setLoading(false);
      return;
    }
    
    console.log('Authentication token found:', token ? 'Yes' : 'No');
    
    fetchAgentData();
  }, [dateRange]);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      console.log('Fetching agent data with params:', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      const response = await axios.get('/api/agents/analytics/performance', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          sortBy: 'performanceMetrics.currentPeriod.averageScores.overallScore',
          sortDirection: 'desc'
        }
      });
      
      console.log('API Response:', response.data);
      setAgents(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching agent analytics data:', err);
      let errorMsg = 'Failed to load agent analytics data.';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMsg += ` Status: ${err.response.status}. ${JSON.stringify(err.response.data)}`;
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        console.error('Response headers:', err.response.headers);
      } else if (err.request) {
        // The request was made but no response was received
        errorMsg += ' No response received from server.';
        console.error('Request:', err.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMsg += ` ${err.message}`;
        console.error('Error message:', err.message);
      }
      
      setError(errorMsg);
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTriggerUpdate = async () => {
    try {
      setLoading(true);
      console.log('Updating metrics with params:', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      await axios.post('/api/agents/analytics/update-all', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        saveHistorical: true,
        periodName: `${new Date(dateRange.startDate).toLocaleString('default', { month: 'long' })} - ${new Date(dateRange.endDate).toLocaleString('default', { month: 'long' })} ${new Date(dateRange.endDate).getFullYear()}`
      });
      
      await fetchAgentData();
    } catch (err) {
      console.error('Error updating agent metrics:', err);
      let errorMsg = 'Failed to update agent metrics.';
      
      if (err.response) {
        errorMsg += ` Status: ${err.response.status}. ${JSON.stringify(err.response.data)}`;
      } else if (err.request) {
        errorMsg += ' No response received from server.';
      } else {
        errorMsg += ` ${err.message}`;
      }
      
      setError(errorMsg);
      setLoading(false);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <AgentPerformanceDashboard agents={agents} loading={loading} onSelectAgent={setSelectedAgent} />;
      case 'comparison':
        return <AgentComparisonChart agents={agents} loading={loading} />;
      case 'historical':
        return <AgentHistoricalTrends agents={agents} loading={loading} />;
      case 'details':
        return <AgentDetailsView agentId={selectedAgent} dateRange={dateRange} />;
      default:
        return <AgentPerformanceDashboard agents={agents} loading={loading} onSelectAgent={setSelectedAgent} />;
    }
  };

  return (
    <Container fluid className="agent-analytics-container">
      <Row className="mb-4">
        <Col>
          <h1>Agent Analytics</h1>
          <p>View and analyze agent performance metrics.</p>
          <p className="text-muted">API URL: {axios.defaults.baseURL}</p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={8}>
          <Card className="filter-card">
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={dateRange.startDate}
                      onChange={handleDateChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={dateRange.endDate}
                      onChange={handleDateChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="d-flex align-items-end">
                  <Button variant="primary" onClick={fetchAgentData} className="me-2">
                    Apply Filters
                  </Button>
                  <Button variant="outline-secondary" onClick={handleTriggerUpdate}>
                    Update Metrics
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="view-selector-card">
            <Card.Body>
              <div className="btn-group w-100">
                <Button 
                  variant={view === 'dashboard' ? 'primary' : 'outline-primary'} 
                  onClick={() => setView('dashboard')}
                >
                  Dashboard
                </Button>
                <Button 
                  variant={view === 'comparison' ? 'primary' : 'outline-primary'} 
                  onClick={() => setView('comparison')}
                >
                  Compare
                </Button>
                <Button 
                  variant={view === 'historical' ? 'primary' : 'outline-primary'} 
                  onClick={() => setView('historical')}
                >
                  Trends
                </Button>
                {selectedAgent && (
                  <Button 
                    variant={view === 'details' ? 'primary' : 'outline-primary'} 
                    onClick={() => setView('details')}
                  >
                    Details
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <div className="alert alert-danger">{error}</div>
          </Col>
        </Row>
      )}

      {renderView()}
    </Container>
  );
};

export default AgentAnalyticsPage; 