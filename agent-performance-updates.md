# Agent Performance Tracking Implementation

To add agent name tracking and performance analytics to your Call Analyzer application, you'll need to implement the following changes:

## 1. Update the Server-Side Prompt Template

Modify `server/server.js` to include the agent's name in the prompt structure:

```javascript
// Call type specific JSON structure and instructions
if (callType === 'hearing') {
  return `${basePrompt}
{
  "callSummary": {
    "agentName": "",
    "patientName": "",
    "appointmentType": "",
    "appointmentDetails": "",
    "hearingAidInfo": "",
    "specialConsiderations": ""
  },
  "agentPerformance": {
    "strengths": ["", "", ""],
    "areasForImprovement": ["", "", ""]
  },
  "improvementSuggestions": ["", "", ""],
  "scorecard": {
    "customerService": 0,
    "productKnowledge": 0,
    "processEfficiency": 0,
    "problemSolving": 0,
    "overallScore": 0
  }
}

This is a call center transcript from a hearing aid clinic. Be sure to identify the agent's name at the beginning of the call. Focus on patient information, appointment scheduling, hearing concerns, and hearing aid details in your analysis.

Here's the transcript:

${transcript}`;
} else {
  // Default to flower shop
  return `${basePrompt}
{
  "callSummary": {
    "agentName": "",
    "customerName": "",
    "orderType": "",
    "deliveryAddress": "",
    "totalValue": "",
    "specialInstructions": ""
  },
  "agentPerformance": {
    "strengths": ["", "", ""],
    "areasForImprovement": ["", "", ""]
  },
  "improvementSuggestions": ["", "", ""],
  "scorecard": {
    "customerService": 0,
    "productKnowledge": 0,
    "processEfficiency": 0,
    "problemSolving": 0,
    "overallScore": 0
  }
}

This is a call center transcript from a flower shop. Be sure to identify the agent's name at the beginning of the call. Focus on order details, delivery information, and flower preferences in your analysis.

Here's the transcript:

${transcript}`;
}
```

## 2. Update the TranscriptHistory Component

Modify `client/src/components/TranscriptHistory.js` to include:

1. Display of agent name in the transcript card:

```jsx
<div className="card-summary">
  <p>
    <strong>
      {transcript.callType === 'hearing' ? 'Patient:' : 'Customer:'}
    </strong> {
      transcript.callType === 'hearing' 
        ? transcript.analysis.callSummary.patientName
        : transcript.analysis.callSummary.customerName
    }
  </p>
  <p>
    <strong>Agent:</strong> {transcript.analysis.callSummary.agentName || 'Unknown'}
  </p>
  <p className="truncate">
    {transcript.rawTranscript.substring(0, 150)}...
  </p>
</div>
```

2. Add agent filtering and performance analytics:

```jsx
// Add these state variables
const [filteredTranscripts, setFilteredTranscripts] = useState([]);
const [filterAgent, setFilterAgent] = useState('');
const [agents, setAgents] = useState([]);

// Add this effect for extracting agents
useEffect(() => {
  const fetchTranscripts = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/transcripts`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transcripts');
      }
      
      const data = await response.json();
      setTranscripts(data);
      setFilteredTranscripts(data);
      
      // Extract unique agent names
      const uniqueAgents = [...new Set(data
        .map(t => t.analysis.callSummary.agentName)
        .filter(name => name && name.trim() !== '')
      )];
      setAgents(uniqueAgents);
    } catch (err) {
      setError('Error loading transcript history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchTranscripts();
}, []);

// Add this effect for filtering by agent
useEffect(() => {
  if (!filterAgent) {
    setFilteredTranscripts(transcripts);
  } else {
    setFilteredTranscripts(transcripts.filter(
      t => t.analysis.callSummary.agentName === filterAgent
    ));
  }
}, [filterAgent, transcripts]);

// Add this function for calculating agent metrics
const calculateAgentMetrics = (transcripts, agentName) => {
  if (!agentName || transcripts.length === 0) return null;
  
  const agentTranscripts = transcripts.filter(
    t => t.analysis.callSummary.agentName === agentName
  );
  
  if (agentTranscripts.length === 0) return null;
  
  // Calculate average scores
  const avgScores = {
    customerService: 0,
    productKnowledge: 0,
    processEfficiency: 0,
    problemSolving: 0,
    overallScore: 0
  };
  
  // Count occurrences of improvement areas
  const improvementAreas = {};
  
  // Count occurrences of strengths
  const strengths = {};
  
  agentTranscripts.forEach(transcript => {
    // Add scores
    Object.keys(avgScores).forEach(key => {
      avgScores[key] += transcript.analysis.scorecard[key] || 0;
    });
    
    // Count improvement areas
    transcript.analysis.agentPerformance.areasForImprovement.forEach(area => {
      const normalized = area.toLowerCase().trim();
      improvementAreas[normalized] = (improvementAreas[normalized] || 0) + 1;
    });
    
    // Count strengths
    transcript.analysis.agentPerformance.strengths.forEach(strength => {
      const normalized = strength.toLowerCase().trim();
      strengths[normalized] = (strengths[normalized] || 0) + 1;
    });
  });
  
  // Calculate averages
  Object.keys(avgScores).forEach(key => {
    avgScores[key] = parseFloat((avgScores[key] / agentTranscripts.length).toFixed(1));
  });
  
  // Get top 3 improvement areas
  const topImprovementAreas = Object.entries(improvementAreas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([area, count]) => ({
      area,
      count,
      percentage: Math.round((count / agentTranscripts.length) * 100)
    }));
  
  // Get top 3 strengths
  const topStrengths = Object.entries(strengths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([strength, count]) => ({
      strength,
      count,
      percentage: Math.round((count / agentTranscripts.length) * 100)
    }));
  
  return {
    callCount: agentTranscripts.length,
    avgScores,
    topImprovementAreas,
    topStrengths
  };
};

// Calculate metrics if filtering by agent
const agentMetrics = calculateAgentMetrics(transcripts, filterAgent);
```

3. Add the UI for agent filtering and metrics:

```jsx
<div className="filter-controls">
  <div className="filter-group">
    <label htmlFor="agentFilter">Filter by Agent:</label>
    <select 
      id="agentFilter" 
      value={filterAgent} 
      onChange={(e) => setFilterAgent(e.target.value)}
    >
      <option value="">All Agents</option>
      {agents.map(agent => (
        <option key={agent} value={agent}>{agent}</option>
      ))}
    </select>
  </div>
</div>

{filterAgent && agentMetrics && (
  <div className="agent-metrics">
    <h3>Performance Metrics for {filterAgent}</h3>
    <div className="metrics-overview">
      <div className="metric-card">
        <div className="metric-value">{agentMetrics.callCount}</div>
        <div className="metric-label">Total Calls</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{agentMetrics.avgScores.overallScore}</div>
        <div className="metric-label">Avg. Overall Score</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{agentMetrics.avgScores.customerService}</div>
        <div className="metric-label">Avg. Customer Service</div>
      </div>
      <div className="metric-card">
        <div className="metric-value">{agentMetrics.avgScores.productKnowledge}</div>
        <div className="metric-label">Avg. Product Knowledge</div>
      </div>
    </div>
    
    <div className="metrics-details">
      <div className="metrics-column">
        <h4>Top Improvement Areas</h4>
        <ul className="metrics-list">
          {agentMetrics.topImprovementAreas.map((item, index) => (
            <li key={index}>
              <div className="metric-item">
                <span className="metric-name">{item.area}</span>
                <div className="metric-bar-container">
                  <div 
                    className="metric-bar" 
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
                <span className="metric-percentage">{item.percentage}%</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="metrics-column">
        <h4>Top Strengths</h4>
        <ul className="metrics-list">
          {agentMetrics.topStrengths.map((item, index) => (
            <li key={index}>
              <div className="metric-item">
                <span className="metric-name">{item.strength}</span>
                <div className="metric-bar-container">
                  <div 
                    className="metric-bar strength-bar" 
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
                <span className="metric-percentage">{item.percentage}%</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
)}
```

## 3. Add CSS Styles

Add these CSS styles to `client/src/App.css`:

```css
/* Filter controls for history page */
.filter-controls {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e1e4e8;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-weight: 600;
  min-width: 100px;
}

.filter-group select {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  font-size: 1rem;
  min-width: 200px;
}

.history-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.clear-filter-button {
  padding: 8px 16px;
  border-radius: 4px;
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.clear-filter-button:hover {
  background-color: #e0e0e0;
}

/* Agent metrics styles */
.agent-metrics {
  margin-bottom: 25px;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.agent-metrics h3 {
  margin-bottom: 20px;
  color: #2c3e50;
  font-size: 1.3rem;
  border-bottom: 1px solid #e1e4e8;
  padding-bottom: 10px;
}

.metrics-overview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.metric-card {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  border: 1px solid #e1e4e8;
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 0.9rem;
  color: #7f8c8d;
}

.metrics-details {
  display: grid;
  grid-template-columns: 1fr;
  gap: 25px;
}

@media (min-width: 768px) {
  .metrics-details {
    grid-template-columns: 1fr 1fr;
  }
}

.metrics-column h4 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.metrics-list {
  list-style: none;
  padding: 0;
}

.metrics-list li {
  margin-bottom: 12px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metric-name {
  flex: 0 0 200px;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-bar-container {
  flex: 1;
  height: 8px;
  background-color: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
}

.metric-bar {
  height: 100%;
  background-color: #e74c3c;
  border-radius: 4px;
}

.strength-bar {
  background-color: #2ecc71;
}

.metric-percentage {
  flex: 0 0 40px;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 500;
}
```

## Implementation Steps

1. Update the server's prompt template to include agent name field
2. Update the TranscriptHistory component to display agent names and allow filtering
3. Add the agent metrics section when filtering by agent
4. Add the CSS styles for the new UI elements

After implementing these changes, you'll be able to track agent performance across calls and gain valuable insights into their strengths and areas for improvement. 