const mongoose = require('mongoose');

// Replace with your actual connection string
const MONGODB_URI = 'mongodb+srv://callanalyzer:callanalyzer%40123@callanalyzer.0bi3jhc.mongodb.net/?retryWrites=true&w=majority&appName=CallAnalyzer';

// Beltone organizationId as ObjectId
const beltoneOrgId = new mongoose.Types.ObjectId('6803d34e2ee3fb8ef1971aac');

// The transcript ID you want to inspect
const transcriptId = '68092e9de9c0eb65a7c4ffa8';

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: 'test' });

  // Use a loose schema to fetch all fields
  const Transcript = mongoose.model('Transcript', new mongoose.Schema({}, { strict: false }));

  // Query for Beltone records mentioning 'flower' or 'roses' in relevant fields
  const query = {
    organizationId: beltoneOrgId,
    $or: [
      { 'analysis.callSummary.briefSummary': /flower|roses/i },
      { 'analysis.callSummary.orderType': /flower|roses/i },
      { 'rawTranscript': /flower|roses/i }
    ]
  };

  const result = await Transcript.deleteMany(query);
  console.log(`Deleted ${result.deletedCount} Beltone flower-related transcripts.`);

  const doc = await Transcript.findById(transcriptId);

  if (!doc) {
    console.log('Transcript not found.');
  } else {
    console.log('--- Full Transcript Document ---');
    console.log(JSON.stringify(doc, null, 2));
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 