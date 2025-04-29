/**
 * Script to update Beltone agent performance metrics
 * Uses direct MongoDB driver to avoid timeouts
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Beltone organization ID
const BELTONE_ORG_ID = '6803d34e2ee3fb8ef1971aac';

// Connection URI
const MONGODB_URI = 'mongodb+srv://callanalyzer:callanalyzer%40123@callanalyzer.0bi3jhc.mongodb.net/test?retryWrites=true&w=majority&appName=CallAnalyzer';

async function updateBeltoneMetrics() {
  let client;
  
  try {
    console.log('Connecting to MongoDB directly...');
    client = new MongoClient(MONGODB_URI);
    
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const db = client.db();
    const agentsCollection = db.collection('agents');
    const transcriptsCollection = db.collection('transcripts');
    
    // Get all Beltone agents
    const agents = await agentsCollection.find({ 
      organizationId: new ObjectId(BELTONE_ORG_ID)
    }).toArray();
    
    console.log(`Found ${agents.length} Beltone agents to process`);
    let updatedCount = 0;
    
    // Set date range for metrics - last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const periodName = endDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Process each agent
    for (const agent of agents) {
      console.log(`Processing agent ${agent._id} (${agent.firstName || ''} ${agent.lastName || ''})`);
      
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
        updatedCount++;
        
      } catch (agentError) {
        console.error(`Error processing agent ${agent._id}:`, agentError);
      }
    }
    
    console.log(`Updated metrics for ${updatedCount} out of ${agents.length} agents`);
    
  } catch (error) {
    console.error('Error updating metrics:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
updateBeltoneMetrics(); 