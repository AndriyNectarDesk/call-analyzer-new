const Transcript = require('../models/transcript');
const mongoose = require('mongoose');
const Organization = require('../models/organization');

// Get all transcripts
exports.getAllTranscripts = async (req, res) => {
  try {
    // Filter by organization ID from authenticated user or request
    const organizationId = req.tenantId || req.user.organizationId;
    
    // If user is master admin and no specific organization filter is applied,
    // allow viewing all transcripts, otherwise enforce organization isolation
    const isMasterAdmin = req.user && req.user.isMasterAdmin;
    
    // Check if this is the master organization - first try to get it from middleware
    let isMasterOrg = req.isMasterOrg || false;
    
    // If not set in middleware, check again
    if (!isMasterOrg && organizationId) {
      // Look up the organization to see if it's marked as the master organization
      try {
        const organization = await Organization.findById(organizationId);
        
        if (organization && organization.isMaster === true) {
          isMasterOrg = true;
        } else if (req.overrideOrganizationName && 
            (req.overrideOrganizationName.toLowerCase().includes('master') || 
            req.overrideOrganizationName.toLowerCase() === 'nectardesk')) {
          // Backward compatibility check
          isMasterOrg = true;
        }
      } catch (err) {
        console.error('Error checking if organization is master:', err);
      }
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    
    // Build query based on role
    let query = {};
    
    // Only allow viewing all transcripts if:
    // They are in the master organization context (regardless of admin status)
    if (isMasterOrg) {
      // Empty query means "all transcripts"
    } else {
      // For regular users or users in a specific org context,
      // strictly filter by the organization ID
      query.organizationId = organizationId;
    }
    
    // Add filters
    if (req.query.callType) {
      query.callType = req.query.callType;
    }
    
    if (req.query.source) {
      query.source = req.query.source;
    }
    
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      query.createdAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      query.createdAt = { $lte: new Date(req.query.endDate) };
    }
    
    // Get total count for pagination
    const total = await Transcript.countDocuments(query);
    
    // Simplified approach - use a basic exclusion projection
    // This will exclude only the heavy rawTranscript field
    const projection = { rawTranscript: 0 };
    
    // Get transcripts with pagination
    const transcripts = await Transcript.find(query, projection)
      .populate('createdBy', 'firstName lastName email')
      .populate('organizationId', 'name code isMaster')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Process each transcript to reduce payload size before sending
    const processedTranscripts = transcripts.map(transcript => {
      // Convert Mongoose document to plain object
      const plainDoc = transcript.toObject ? transcript.toObject() : transcript;
      
      // Only keep specific fields that are needed on the history page
      const result = {
        _id: plainDoc._id,
        callType: plainDoc.callType,
        source: plainDoc.source,
        createdAt: plainDoc.createdAt,
        organizationId: plainDoc.organizationId,
        createdBy: plainDoc.createdBy
      };
      
      // Add minimal summary data if available
      if (plainDoc.analysis) {
        result.analysis = {};
        if (plainDoc.analysis.callSummary) {
          result.analysis.callSummary = {
            briefSummary: plainDoc.analysis.callSummary.briefSummary
          };
        }
        if (plainDoc.analysis.scorecard) {
          result.analysis.scorecard = plainDoc.analysis.scorecard;
        }
      }
      
      // Add only title from metadata
      if (plainDoc.metadata && plainDoc.metadata.title) {
        result.metadata = { title: plainDoc.metadata.title };
      } else if (plainDoc.metadata && plainDoc.metadata.get && plainDoc.metadata.get('title')) {
        // Handle Map type metadata
        result.metadata = { title: plainDoc.metadata.get('title') };
      }
      
      return result;
    });
    
    // Send the response with processed transcripts
    const responseData = {
      transcripts: processedTranscripts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error getting transcripts:', error);
    res.status(500).json({ message: 'Failed to retrieve transcripts' });
  }
};

// Get a single transcript
exports.getTranscript = async (req, res) => {
  try {
    const organizationId = req.tenantId || req.user.organizationId;
    
    // Check if user is a master admin or part of the master organization
    const isMasterAdmin = req.user && req.user.isMasterAdmin;
    let isMasterOrg = req.isMasterOrg || false;
    
    if (!isMasterOrg && organizationId) {
      try {
        const Organization = require('../models/organization');
        const organization = await Organization.findById(organizationId);
        
        if (organization && organization.isMaster === true) {
          isMasterOrg = true;
        }
      } catch (err) {
        console.error('Error checking if organization is master:', err);
      }
    }
    
    // Build query based on role
    let query = { _id: req.params.id };
    
    // If not master org/admin, restrict to their organization's transcripts
    if (!isMasterOrg && !isMasterAdmin) {
      query.organizationId = organizationId;
    }
    
    const transcript = await Transcript.findOne(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('organizationId', 'name code isMaster');
    
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }
    
    res.json(transcript);
  } catch (error) {
    console.error('Error getting transcript:', error);
    res.status(500).json({ message: 'Failed to retrieve transcript' });
  }
};

// Create a new transcript (from raw text)
exports.createTranscript = async (req, res) => {
  try {
    const { rawTranscript, callType } = req.body;
    const organizationId = req.tenantId || req.user.organizationId;
    
    if (!rawTranscript) {
      return res.status(400).json({ message: 'Transcript text is required' });
    }
    
    // Create new transcript record
    const transcript = new Transcript({
      rawTranscript,
      callType: callType || 'auto',
      organizationId,
      source: 'web',
      createdBy: req.user.userId
    });
    
    await transcript.save();
    
    // Update organization transcript count
    await Organization.findByIdAndUpdate(
      organizationId,
      { $inc: { 'usageStats.totalTranscripts': 1 } }
    );
    
    // Return the created transcript data
    res.status(201).json(transcript);
  } catch (error) {
    console.error('Error creating transcript:', error);
    res.status(500).json({ message: 'Failed to create transcript' });
  }
};

// Get transcript analytics (aggregated data)
exports.getTranscriptAnalytics = async (req, res) => {
  try {
    const organizationId = req.tenantId || req.user.organizationId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Aggregation pipeline
    const pipeline = [
      {
        $match: {
          organizationId: mongoose.Types.ObjectId(organizationId),
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          avgCustomerService: { $avg: '$analysis.scorecard.customerService' },
          avgProductKnowledge: { $avg: '$analysis.scorecard.productKnowledge' },
          avgProcessEfficiency: { $avg: '$analysis.scorecard.processEfficiency' },
          avgProblemSolving: { $avg: '$analysis.scorecard.problemSolving' },
          avgOverallScore: { $avg: '$analysis.scorecard.overallScore' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];
    
    const analytics = await Transcript.aggregate(pipeline);
    
    const callTypeCounts = await Transcript.aggregate([
      {
        $match: {
          organizationId: mongoose.Types.ObjectId(organizationId),
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: '$callType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      timeline: analytics,
      callTypes: callTypeCounts,
      dateRange: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting transcript analytics:', error);
    res.status(500).json({ message: 'Failed to retrieve analytics' });
  }
};

// Delete a transcript
exports.deleteTranscript = async (req, res) => {
  try {
    const organizationId = req.tenantId || req.user.organizationId;
    
    const transcript = await Transcript.findOneAndDelete({
      _id: req.params.id,
      organizationId
    });
    
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }
    
    res.json({ message: 'Transcript deleted successfully' });
  } catch (error) {
    console.error('Error deleting transcript:', error);
    res.status(500).json({ message: 'Failed to delete transcript' });
  }
}; 