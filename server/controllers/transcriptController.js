const Transcript = require('../models/transcript');
const mongoose = require('mongoose');
const Organization = require('../models/organization');

// Get all transcripts
exports.getAllTranscripts = async (req, res) => {
  try {
    // Filter by organization ID from authenticated user or request
    const organizationId = req.tenantId || req.user.organizationId;
    console.log('Getting transcripts for organization:', organizationId);
    
    // Additional debug logging to track the organization context
    if (req.overrideOrganizationId) {
      console.log('Organization context override in effect:', 
        req.overrideOrganizationName, 
        `(${req.overrideOrganizationId})`
      );
    }
    
    // Debug the user's organization context from JWT
    if (req.user && req.user.organizationId) {
      console.log('User JWT organization context:', req.user.organizationId);
    }
    
    // Check if the current organization is the master organization
    // We use organization ID for reliable identification
    const MASTER_ORG_ID = process.env.MASTER_ORG_ID || '64d5ece33f7443afa6b684d2'; // Default ID or from env
    
    // Use the organizationId that was set by the tenant isolation middleware
    const currentOrgId = organizationId ? organizationId.toString() : null;
    const isMasterOrg = currentOrgId === MASTER_ORG_ID;
    
    console.log('Is master organization context:', isMasterOrg, 'Current ID:', currentOrgId, 'Master ID:', MASTER_ORG_ID);
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    
    // Build query based on organization context
    let query = {};
    
    // Only organization type matters for transcript visibility
    if (isMasterOrg) {
      console.log('Master organization context - showing all transcripts');
      // Empty query means "all transcripts"
    } else {
      // For any non-master organization, strictly filter by organization ID
      console.log('Filtering transcripts by organization ID:', organizationId);
      
      // Use MongoDB ObjectId for proper comparison
      // This ensures we correctly filter by organization 
      try {
        query.organizationId = new mongoose.Types.ObjectId(organizationId);
      } catch (err) {
        console.error('Error converting organizationId to ObjectId:', err);
        // Fall back to string comparison if conversion fails
        query.organizationId = organizationId;
      }
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
    
    console.log('Final transcript query:', JSON.stringify(query));
    
    // Get total count for pagination
    const total = await Transcript.countDocuments(query);
    console.log('Total matching transcripts:', total);
    
    // Get transcripts with pagination
    const transcripts = await Transcript.find(query)
      .select('-rawTranscript') // Don't return full transcript in listing
      .populate('createdBy', 'firstName lastName email')
      .populate('organizationId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log('Retrieved transcripts:', transcripts.length);
    
    res.json({
      transcripts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting transcripts:', error);
    res.status(500).json({ message: 'Failed to retrieve transcripts' });
  }
};

// Get a single transcript
exports.getTranscript = async (req, res) => {
  try {
    const organizationId = req.tenantId || req.user.organizationId;
    
    const transcript = await Transcript.findOne({
      _id: req.params.id,
      organizationId
    }).populate('createdBy', 'firstName lastName email');
    
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