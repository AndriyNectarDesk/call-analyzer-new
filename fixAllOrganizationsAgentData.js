/**
 * Comprehensive script to fix agent data for ALL organizations
 * This will:
 * 1. Update agent names from transcript data
 * 2. Update performance metrics
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Connection URI
const MONGODB_URI = 'mongodb+srv://callanalyzer:callanalyzer%40123@callanalyzer.0bi3jhc.mongodb.net/test?retryWrites=true&w=majority&appName=CallAnalyzer';

async function fixAllOrganizationsAgentData() {
  let client;
  
  try {
    console.log('Connecting to MongoDB directly...');
    client = new MongoClient(MONGODB_URI);
    
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const db = client.db();
    const orgsCollection = db.collection('organizations');
    const agentsCollection = db.collection('agents');
    const transcriptsCollection = db.collection('transcripts');
    
    // Get all active organizations
    const organizations = await orgsCollection.find({ 
      active: { $ne: false } 
    }).toArray();
    
    console.log(`Found ${organizations.length} organizations to process`);
    
    // Set date range for metrics - last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const periodName = endDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Process each organization
    for (const org of organizations) {
      try {
        console.log(`\n===== Processing organization: ${org.name || 'Unnamed'} (${org._id}) =====`);
        
        // Get all agents for this organization
        const agents = await agentsCollection.find({ 
          organizationId: org._id
        }).toArray();
        
        console.log(`Found ${agents.length} agents for organization ${org.name || 'Unnamed'}`);
        
        if (agents.length === 0) {
          console.log(`No agents found for organization ${org._id}, skipping...`);
          continue;
        }
        
        // Get transcript count for this organization
        const transcriptCount = await transcriptsCollection.countDocuments({
          organizationId: org._id
        });
        
        console.log(`Found ${transcriptCount} transcripts for organization ${org.name || 'Unnamed'}`);
        
        if (transcriptCount === 0) {
          console.log(`No transcripts found for organization ${org._id}, skipping...`);
          continue;
        }
        
        // Step 1: Fix agent names
        console.log('\n--- Fixing agent names ---');
        let nameUpdatesCount = 0;
        
        for (const agent of agents) {
          console.log(`Processing agent ${agent._id} (externalId: ${agent.externalId || 'N/A'})`);
          
          // Check if name is already populated
          if (agent.firstName && agent.lastName) {
            console.log(`Agent ${agent._id} already has a name (${agent.firstName} ${agent.lastName}), skipping name update`);
            continue;
          }
          
          // Find a transcript with this agent's ID that has agent details
          const transcript = await transcriptsCollection.findOne({
            agentId: agent._id,
            'callDetails.agent': { $exists: true }
          });
          
          if (transcript && transcript.callDetails && transcript.callDetails.agent) {
            const agentDetails = transcript.callDetails.agent;
            const updateData = {};
            let shouldUpdate = false;
            
            // Check if agent has a name in transcript
            if (agentDetails.name) {
              // Split the name (usually in format "First Last")
              const nameParts = agentDetails.name.split(' ');
              
              if (nameParts.length >= 2) {
                // Use last part as lastName, everything else as firstName
                const lastName = nameParts.pop();
                const firstName = nameParts.join(' ');
                
                updateData.firstName = firstName;
                updateData.lastName = lastName;
                shouldUpdate = true;
              } else if (nameParts.length === 1) {
                // Only one name part, use as firstName
                updateData.firstName = agentDetails.name;
                shouldUpdate = true;
              }
            }
            
            // Check for other fields
            if (agentDetails.email && (!agent.email || agent.email === null)) {
              updateData.email = agentDetails.email;
              shouldUpdate = true;
            }
            
            if (agentDetails.phone && (!agent.phone || agent.phone === null)) {
              updateData.phone = agentDetails.phone;
              shouldUpdate = true;
            }
            
            // Update the agent if we have new data
            if (shouldUpdate) {
              await agentsCollection.updateOne(
                { _id: agent._id },
                { $set: updateData }
              );
              
              console.log(`Updated agent ${agent._id} with:`, updateData);
              nameUpdatesCount++;
            } else {
              console.log(`No name information found for agent ${agent._id}`);
            }
          } else {
            console.log(`No transcript found with agent information for ${agent._id}`);
          }
        }
        
        console.log(`Updated names for ${nameUpdatesCount} out of ${agents.length} agents`);
        
        // Step 2: Update performance metrics
        console.log('\n--- Updating performance metrics ---');
        let metricsUpdatesCount = 0;
        
        // Get fresh list of agents (with updated names)
        const updatedAgents = await agentsCollection.find({ 
          organizationId: org._id
        }).toArray();
        
        for (const agent of updatedAgents) {
          console.log(`Processing metrics for agent ${agent._id} (${agent.firstName || ''} ${agent.lastName || ''})`);
          
          try {
            // Find all transcripts for this agent
            const transcripts = await transcriptsCollection.find({
              agentId: agent._id
            }).toArray();
            
            console.log(`Found ${transcripts.length} transcripts for agent ${agent._id}`);
            
            if (transcripts.length === 0) {
              continue; // Skip to next agent
            }
            
            // Calculate performance metrics
            const metrics = {
              callCount: transcripts.length,
              averageScores: {
                customerService: 0,
                productKnowledge: 0,
                processEfficiency: 0,
                problemSolving: 0,
                overallScore: 0
              },
              avgCallDuration: 0,
              avgTalkTime: 0,
              avgWaitingTime: 0
            };
            
            // Track counts for averaging
            let scoreCount = 0;
            let durationCount = 0;
            let talkTimeCount = 0;
            let waitTimeCount = 0;
            
            // Track strengths and areas for improvement
            const strengths = {};
            const areasForImprovement = {};
            
            // Process each transcript
            for (const transcript of transcripts) {
              // Aggregate scores
              if (transcript.analysis && transcript.analysis.scorecard) {
                const scorecard = transcript.analysis.scorecard;
                
                if (typeof scorecard.customerService === 'number') {
                  metrics.averageScores.customerService += scorecard.customerService;
                }
                if (typeof scorecard.productKnowledge === 'number') {
                  metrics.averageScores.productKnowledge += scorecard.productKnowledge;
                }
                if (typeof scorecard.processEfficiency === 'number') {
                  metrics.averageScores.processEfficiency += scorecard.processEfficiency;
                }
                if (typeof scorecard.problemSolving === 'number') {
                  metrics.averageScores.problemSolving += scorecard.problemSolving;
                }
                if (typeof scorecard.overallScore === 'number') {
                  metrics.averageScores.overallScore += scorecard.overallScore;
                }
                
                scoreCount++;
              }
              
              // Aggregate call metrics
              if (transcript.callDetails) {
                if (typeof transcript.callDetails.duration === 'number') {
                  metrics.avgCallDuration += transcript.callDetails.duration;
                  durationCount++;
                }
                
                if (typeof transcript.callDetails.talkTime === 'number') {
                  metrics.avgTalkTime += transcript.callDetails.talkTime;
                  talkTimeCount++;
                }
                
                if (typeof transcript.callDetails.waitingTime === 'number') {
                  metrics.avgWaitingTime += transcript.callDetails.waitingTime;
                  waitTimeCount++;
                }
              }
              
              // Aggregate strengths and areas for improvement
              if (transcript.analysis && transcript.analysis.agentPerformance) {
                const performance = transcript.analysis.agentPerformance;
                
                if (Array.isArray(performance.strengths)) {
                  performance.strengths.forEach(strength => {
                    strengths[strength] = (strengths[strength] || 0) + 1;
                  });
                }
                
                if (Array.isArray(performance.areasForImprovement)) {
                  performance.areasForImprovement.forEach(area => {
                    areasForImprovement[area] = (areasForImprovement[area] || 0) + 1;
                  });
                }
              }
            }
            
            // Calculate averages
            if (scoreCount > 0) {
              metrics.averageScores.customerService /= scoreCount;
              metrics.averageScores.productKnowledge /= scoreCount;
              metrics.averageScores.processEfficiency /= scoreCount;
              metrics.averageScores.problemSolving /= scoreCount;
              metrics.averageScores.overallScore /= scoreCount;
            }
            
            if (durationCount > 0) {
              metrics.avgCallDuration /= durationCount;
            }
            
            if (talkTimeCount > 0) {
              metrics.avgTalkTime /= talkTimeCount;
            }
            
            if (waitTimeCount > 0) {
              metrics.avgWaitingTime /= waitTimeCount;
            }
            
            // Get top 5 strengths and areas for improvement
            const topStrengths = Object.entries(strengths)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(entry => entry[0]);
              
            const topAreasForImprovement = Object.entries(areasForImprovement)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(entry => entry[0]);
            
            // Update current period metrics
            const currentPeriod = {
              startDate,
              endDate,
              callCount: metrics.callCount,
              averageScores: {
                customerService: parseFloat(metrics.averageScores.customerService.toFixed(2)),
                productKnowledge: parseFloat(metrics.averageScores.productKnowledge.toFixed(2)),
                processEfficiency: parseFloat(metrics.averageScores.processEfficiency.toFixed(2)),
                problemSolving: parseFloat(metrics.averageScores.problemSolving.toFixed(2)),
                overallScore: parseFloat(metrics.averageScores.overallScore.toFixed(2))
              },
              avgCallDuration: parseFloat(metrics.avgCallDuration.toFixed(2)),
              avgTalkTime: parseFloat(metrics.avgTalkTime.toFixed(2)),
              avgWaitingTime: parseFloat(metrics.avgWaitingTime.toFixed(2))
            };
            
            // Create historical entry
            const historicalEntry = {
              ...currentPeriod,
              periodName,
              commonStrengths: topStrengths,
              commonAreasForImprovement: topAreasForImprovement
            };
            
            // Update the agent document
            await agentsCollection.updateOne(
              { _id: agent._id },
              { 
                $set: { 
                  'performanceMetrics.currentPeriod': currentPeriod
                },
                $push: {
                  'performanceMetrics.historical': {
                    $each: [historicalEntry],
                    $position: 0,
                    $slice: 12  // Keep only last 12 entries
                  }
                }
              }
            );
            
            console.log(`Updated metrics for agent ${agent._id}`);
            metricsUpdatesCount++;
            
          } catch (agentError) {
            console.error(`Error processing agent ${agent._id}:`, agentError);
          }
        }
        
        console.log(`Updated metrics for ${metricsUpdatesCount} out of ${updatedAgents.length} agents in organization ${org.name || 'Unnamed'}`);
        
      } catch (orgError) {
        console.error(`Error processing organization ${org._id}:`, orgError);
      }
    }
    
    console.log('\n===== Agent data update complete =====');
    
  } catch (error) {
    console.error('Error fixing agent data:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
fixAllOrganizationsAgentData(); 