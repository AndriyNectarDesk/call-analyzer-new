const express = require('express');
const router = express.Router();
const { authenticateJWT, handleOrganizationContext, tenantIsolation } = require('../../middleware/authMiddleware');
const Agent = require('../../models/agent');
const agentAnalyticsService = require('../../services/agentAnalyticsService');

// All routes require authentication
router.use(authenticateJWT);

// Add organization context handling middleware
router.use(handleOrganizationContext);

// Add tenant isolation middleware
router.use(tenantIsolation);

/**
 * @route GET /api/agents
 * @description Get all agents for an organization
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    // Get organization context from middleware
    const organizationId = req.tenantId || req.user.organizationId;
    const isMasterOrg = req.isMasterOrg || false;
    
    console.log(`Fetching agents with context: organizationId=${organizationId}, isMasterOrg=${isMasterOrg}`);
    
    // Get query parameters
    const { 
      status, 
      sortBy, 
      sortDirection, 
      limit = 100, 
      offset = 0,
      search,
      organizationId: queryOrgId
    } = req.query;
    
    // Build query with tenant isolation
    let query = {};
    
    // Master org can see all agents or filter by a specific org
    if (isMasterOrg && queryOrgId && queryOrgId !== 'all') {
      console.log(`Master org filtering for specific organization: ${queryOrgId}`);
      query.organizationId = queryOrgId;
    } 
    // Regular users are restricted to their organization
    else if (!isMasterOrg) {
      console.log(`Regular user restricted to organization: ${organizationId}`);
      query.organizationId = organizationId;
    }
    // Master org with 'all' selected - no filter needed
    else {
      console.log('Master org viewing all agents');
    }
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { externalId: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('Final query:', JSON.stringify(query));
    
    // Determine sort options
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortDirection === 'asc' ? 1 : -1;
    } else {
      sortOptions.lastName = 1; // Default sort by last name
    }
    
    // Get agents
    const agents = await Agent.find(query)
      .sort(sortOptions)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('organizationId', 'name code isMaster');
    
    console.log(`Found ${agents.length} agents for query`);
    
    // Get total count for pagination
    const total = await Agent.countDocuments(query);
    
    // Map agents to include performance metrics
    const mappedAgents = agents.map(agent => {
      // Create a plain object from the mongoose document
      const agentObj = agent.toObject ? agent.toObject() : agent;
      
      // Extract fields we need, ensuring performanceMetrics is included
      return {
        _id: agentObj._id,
        externalId: agentObj.externalId,
        firstName: agentObj.firstName,
        lastName: agentObj.lastName,
        email: agentObj.email,
        department: agentObj.department,
        position: agentObj.position,
        status: agentObj.status,
        skills: agentObj.skills || [],
        performanceMetrics: agentObj.performanceMetrics || {
          currentPeriod: {},
          historical: []
        },
        organizationId: agentObj.organizationId,
        createdAt: agentObj.createdAt
      };
    });
    
    // Return consistent response format
    res.json({
      agents: mappedAgents,
      pagination: {
        total,
        offset: parseInt(offset),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/agents/analytics/performance
 * @description Get performance analytics for all agents in the organization
 * @access Private
 */
router.get('/analytics/performance', async (req, res) => {
  try {
    // Get organization context from middleware
    const organizationId = req.tenantId || req.user.organizationId;
    
    // Get query parameters
    const { 
      startDate, 
      endDate, 
      limit = 100,
      sortBy = 'performanceMetrics.currentPeriod.averageScores.overallScore',
      sortDirection = 'desc',
      status = 'active'
    } = req.query;
    
    // Build options
    const options = {
      limit: parseInt(limit),
      sortBy,
      ascending: sortDirection === 'asc',
      status
    };
    
    if (startDate) {
      options.startDate = new Date(startDate);
    }
    
    if (endDate) {
      options.endDate = new Date(endDate);
    }
    
    // Get performance data
    const performanceData = await agentAnalyticsService.getOrganizationAgentPerformance(
      organizationId,
      options
    );
    
    res.json(performanceData);
  } catch (error) {
    console.error('Error fetching agent performance analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/agents/analytics/update-all
 * @description Update performance metrics for all agents in the organization
 * @access Private
 */
router.post('/analytics/update-all', async (req, res) => {
  try {
    // Get organization context from middleware
    const organizationId = req.tenantId || req.user.organizationId;
    
    // Get options from request body
    const { 
      startDate, 
      endDate,
      saveHistorical,
      periodName
    } = req.body;
    
    // Build options
    const options = { saveHistorical };
    
    if (startDate) {
      options.startDate = new Date(startDate);
    }
    
    if (endDate) {
      options.endDate = new Date(endDate);
    }
    
    if (periodName) {
      options.periodName = periodName;
    }
    
    // Update metrics for all agents
    const result = await agentAnalyticsService.updateAllAgentMetrics(
      organizationId,
      options
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error updating all agent metrics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/agents/analytics/trigger-update-job
 * @description Manually trigger the agent metrics update job
 * @access Private (admin only)
 */
router.post('/analytics/trigger-update-job', async (req, res) => {
  try {
    // Check if user is an admin
    if (req.user.role !== 'admin' && !req.user.isMasterAdmin) {
      return res.status(403).json({ message: 'Not authorized to perform this action' });
    }
    
    const { schedulerService } = require('../../services');
    
    // Attempt to run the job now
    const success = await schedulerService.runJobNow('updateAgentMetrics');
    
    if (success) {
      res.json({ message: 'Agent metrics update job triggered successfully' });
    } else {
      // If the job wasn't found in the scheduler, run it directly
      const agentMetricsJob = require('../../jobs/updateAgentMetrics');
      await agentMetricsJob.job();
      res.json({ message: 'Agent metrics update job executed directly' });
    }
  } catch (error) {
    console.error('Error triggering agent metrics update job:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/agents/:id
 * @description Get a specific agent by ID
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findOne({
      _id: req.params.id,
      organizationId: req.tenantId || req.user.organizationId
    });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/agents/:id/performance
 * @description Get performance metrics for a specific agent
 * @access Private
 */
router.get('/:id/performance', async (req, res) => {
  try {
    const agent = await Agent.findOne({
      _id: req.params.id,
      organizationId: req.tenantId || req.user.organizationId
    });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Get date range from query parameters
    const { startDate, endDate, updateMetrics } = req.query;
    
    // If updateMetrics is true, recalculate metrics
    if (updateMetrics === 'true') {
      const options = {};
      
      if (startDate) {
        options.startDate = new Date(startDate);
      }
      
      if (endDate) {
        options.endDate = new Date(endDate);
      }
      
      await agentAnalyticsService.updateAgentPerformanceMetrics(agent._id, options);
      
      // Refresh agent data
      const updatedAgent = await Agent.findById(agent._id);
      return res.json(updatedAgent.performanceMetrics);
    }
    
    res.json(agent.performanceMetrics);
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/agents
 * @description Create a new agent
 * @access Private
 */
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      externalId,
      department,
      position,
      skills,
      status = 'active'
    } = req.body;
    
    // Get organization context from middleware
    const organizationId = req.tenantId || req.user.organizationId;
    
    // Check if agent with this email already exists in this organization
    if (email) {
      const existingAgent = await Agent.findOne({
        organizationId,
        email
      });
      
      if (existingAgent) {
        return res.status(400).json({ message: 'Agent with this email already exists' });
      }
    }
    
    // Check if agent with this externalId already exists in this organization
    if (externalId) {
      const existingAgent = await Agent.findOne({
        organizationId,
        externalId
      });
      
      if (existingAgent) {
        return res.status(400).json({ message: 'Agent with this external ID already exists' });
      }
    }
    
    // Create new agent
    const agent = new Agent({
      firstName,
      lastName,
      email,
      externalId,
      department,
      position,
      skills: skills || [],
      status,
      organizationId
    });
    
    await agent.save();
    
    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/agents/:id
 * @description Update an agent
 * @access Private
 */
router.put('/:id', async (req, res) => {
  try {
    const agent = await Agent.findOne({
      _id: req.params.id,
      organizationId: req.tenantId || req.user.organizationId
    });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Update basic fields
    const updateFields = [
      'firstName', 
      'lastName', 
      'email', 
      'externalId',
      'department', 
      'position', 
      'skills',
      'status'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        agent[field] = req.body[field];
      }
    });
    
    await agent.save();
    
    res.json(agent);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/agents/:id
 * @description Delete an agent
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    // Get organization context from middleware
    const organizationId = req.tenantId || req.user.organizationId;
    
    // Find the agent
    const agent = await Agent.findOne({
      _id: req.params.id,
      organizationId
    });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Delete the agent
    await Agent.deleteOne({ _id: req.params.id });
    
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 