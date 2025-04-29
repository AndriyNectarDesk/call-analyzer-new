const mongoose = require('mongoose');

// Connection URI (same as found in the inspectTranscript.js file)
const MONGODB_URI = 'mongodb+srv://callanalyzer:callanalyzer%40123@callanalyzer.0bi3jhc.mongodb.net/?retryWrites=true&w=majority&appName=CallAnalyzer';

// Beltone organizationId
const BELTONE_ORG_ID = '6803d34e2ee3fb8ef1971aac';

async function fetchBeltoneAgents() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: 'test' });
    console.log('Connected successfully to MongoDB');
    
    // Create a model with a loose schema to ensure we get all fields
    const Agent = mongoose.model('Agent', new mongoose.Schema({}, { strict: false }));
    
    // Find the total number of agents for Beltone
    const totalAgents = await Agent.countDocuments({
      organizationId: new mongoose.Types.ObjectId(BELTONE_ORG_ID)
    });
    
    console.log(`Total agents found for Beltone: ${totalAgents}`);
    
    // Get all agents for Beltone organization (limit to 5 for readability)
    const agents = await Agent.find({
      organizationId: new mongoose.Types.ObjectId(BELTONE_ORG_ID)
    }).limit(5);
    
    if (agents && agents.length > 0) {
      console.log(`Found ${agents.length} Beltone agents:`);
      
      // Display each agent with a summary of fields
      agents.forEach((agent, index) => {
        const agentObj = agent.toObject();
        
        // Create a simplified view for readability
        const summary = {
          _id: agentObj._id,
          externalId: agentObj.externalId,
          name: `${agentObj.firstName || 'N/A'} ${agentObj.lastName || ''}`.trim(),
          email: agentObj.email || 'N/A',
          status: agentObj.status || 'N/A',
          department: agentObj.department || 'N/A',
          position: agentObj.position || 'N/A',
          skills: agentObj.skills || [],
          hasPerformanceMetrics: !!agentObj.performanceMetrics?.currentPeriod?.averageScores,
          createdAt: agentObj.createdAt
        };
        
        console.log(`\nAgent ${index + 1}:`);
        console.log(JSON.stringify(summary, null, 2));
        
        // If this agent has performance metrics, show them
        if (agentObj.performanceMetrics?.currentPeriod?.averageScores) {
          console.log('\nPerformance Metrics:');
          console.log(JSON.stringify(agentObj.performanceMetrics.currentPeriod, null, 2));
        }
      });
      
      // Show the complete details of the first agent
      console.log('\n\nComplete Details of First Agent:');
      console.log(JSON.stringify(agents[0].toObject(), null, 2));
    } else {
      console.log('No agents found for Beltone organization.');
    }
  } catch (error) {
    console.error('Error fetching agents:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
fetchBeltoneAgents(); 