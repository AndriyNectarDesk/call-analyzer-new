const Transcript = require('../models/transcript');
const mongoose = require('mongoose');
const Organization = require('../models/organization');

// Get all transcripts
exports.getAllTranscripts = async (req, res) => {
  try {
    // Filter by organization ID from authenticated user or request
    const organizationId = req.tenantId || req.user.organizationId;
    console.log('Getting transcripts for organization:', organizationId);
    console.log('Request user:', req.user ? {
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      isMasterAdmin: req.user.isMasterAdmin
    } : 'No user in request');
    
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
          console.log('Found master organization with ID:', organizationId);
        } else if (req.overrideOrganizationName && 
            (req.overrideOrganizationName.toLowerCase().includes('master') || 
            req.overrideOrganizationName.toLowerCase() === 'nectardesk')) {
          // Backward compatibility check
          isMasterOrg = true;
          console.log('Name-based master organization detected:', req.overrideOrganizationName);
        }
      } catch (err) {
        console.error('Error checking if organization is master:', err);
      }
    }
    
    console.log('User is master admin:', isMasterAdmin);
    console.log('Is master organization context:', isMasterOrg);
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    
    // Build query based on role
    let query = {};
    
    // Only allow viewing all transcripts if:
    // They are in the master organization context (regardless of admin status)
    if (isMasterOrg) {
      console.log('Master organization context - showing all transcripts');
      // Empty query means "all transcripts"
    } else {
      // For regular users or users in a specific org context,
      // strictly filter by the organization ID
      console.log('Filtering transcripts by organization ID:', organizationId);
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
    
    console.log('Final transcript query:', JSON.stringify(query));
    
    // Get total count for pagination
    const total = await Transcript.countDocuments(query);
    console.log('Total matching transcripts:', total);
    
    // Get transcripts with pagination
    const transcripts = await Transcript.find(query)
      .select('-rawTranscript') // Don't return full transcript in listing
      .populate('createdBy', 'firstName lastName email')
      .populate('organizationId', 'name code isMaster')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log('Retrieved transcripts:', transcripts.length);
    
    // For debugging - check if transcripts have valid organizationId
    if (transcripts.length > 0) {
      const hasMissingOrg = transcripts.some(t => !t.organizationId);
      if (hasMissingOrg) {
        console.warn('WARNING: Some transcripts have missing organizationId');
      }
    }
    
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