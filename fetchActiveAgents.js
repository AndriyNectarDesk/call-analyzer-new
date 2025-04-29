const mongoose = require('mongoose');

// Connection URI 
const MONGODB_URI = 'mongodb+srv://callanalyzer:callanalyzer%40123@callanalyzer.0bi3jhc.mongodb.net/?retryWrites=true&w=majority&appName=CallAnalyzer';

async function fetchBestAgentData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: 'test' });
    console.log('Connected successfully to MongoDB');
    
    // Create models with loose schemas
    const Agent = mongoose.model('Agent', new mongoose.Schema({}, { strict: false }));
    const Organization = mongoose.model('Organization', new mongoose.Schema({}, { strict: false }));
    
    // First check organizations
    const organizations = await Organization.find({}).limit(5);
    console.log(`Found ${organizations.length} organizations`);
    
    if (organizations.length > 0) {
      organizations.forEach((org, i) => {
        console.log(`Organization ${i+1}: ${org.name || 'No name'} (${org._id})`);
      });
    }
    
    // Look for agents with the most detailed information
    console.log('\nSearching for agents with most complete data...');
    
    // Different query strategies to find the most complete agents
    const queries = [
      // Agents with performance metrics
      { 'performanceMetrics.currentPeriod.averageScores': { $exists: true } },
      // Agents with names
      { firstName: { $exists: true, $ne: null } },
      // Agents with departments
      { department: { $exists: true, $ne: null } },
      // Agents with skills
      { skills: { $exists: true, $not: { $size: 0 } } }
    ];
    
    let foundAgent = null;
    
    // Try each query until we find a good agent
    for (const query of queries) {
      if (foundAgent) break;
      
      console.log('Trying new query strategy...');
      const agents = await Agent.find(query).limit(5);
      
      if (agents && agents.length > 0) {
        console.log(`Found ${agents.length} agents with more complete data`);
        
        // Check which organization each belongs to
        for (const agent of agents) {
          const agentObj = agent.toObject();
          const orgId = agentObj.organizationId;
          
          if (orgId) {
            const organization = await Organization.findById(orgId);
            const orgName = organization ? organization.name : 'Unknown organization';
            
            console.log(`\nFound agent with ID ${agent._id} from organization: ${orgName} (${orgId})`);
            console.log('Agent data:');
            
            // Create a readable summary
            const summary = {
              _id: agentObj._id,
              externalId: agentObj.externalId,
              name: `${agentObj.firstName || 'N/A'} ${agentObj.lastName || ''}`.trim(),
              email: agentObj.email || 'N/A',
              phone: agentObj.phone || 'N/A',
              status: agentObj.status || 'N/A',
              department: agentObj.department || 'N/A',
              position: agentObj.position || 'N/A',
              skills: agentObj.skills || [],
              hasPerformanceMetrics: !!agentObj.performanceMetrics?.currentPeriod?.averageScores,
              createdAt: agentObj.createdAt
            };
            
            console.log(JSON.stringify(summary, null, 2));
            
            // If this agent has performance metrics, show them
            if (agentObj.performanceMetrics?.currentPeriod?.averageScores) {
              console.log('\nPerformance Metrics:');
              console.log(JSON.stringify(agentObj.performanceMetrics.currentPeriod, null, 2));
            }
            
            // Keep this agent as our found agent
            foundAgent = agent;
            break;
          }
        }
      }
    }
    
    // If we still didn't find a good agent, show the most recently created one
    if (!foundAgent) {
      console.log('\nFalling back to most recent agent...');
      foundAgent = await Agent.findOne().sort({ createdAt: -1 });
      
      if (foundAgent) {
        console.log('Most recent agent:');
        console.log(JSON.stringify(foundAgent.toObject(), null, 2));
      }
    }
    
    // Final message
    if (!foundAgent) {
      console.log('No agents with detailed information found.');
    }
    
  } catch (error) {
    console.error('Error fetching agents:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
fetchBestAgentData(); 