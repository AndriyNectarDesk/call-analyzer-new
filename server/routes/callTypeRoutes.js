const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CallType = mongoose.model('CallType');
const { authenticateJWT, isOrgAdmin } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateJWT);

// Get all call types
router.get('/', async (req, res) => {
  try {
    const query = { active: true };
    
    // If not master admin, limit to global call types or those belonging to user's org
    if (!req.user.isMasterAdmin) {
      query.$or = [
        { isGlobal: true },
        { organizationId: req.user.organizationId }
      ];
    }
    
    const callTypes = await CallType.find(query).sort('name');
    res.json(callTypes);
  } catch (error) {
    console.error('Error fetching call types:', error);
    res.status(500).json({ message: 'Failed to fetch call types' });
  }
});

// Get a single call type
router.get('/:id', async (req, res) => {
  try {
    const callType = await CallType.findById(req.params.id);
    
    if (!callType) {
      return res.status(404).json({ message: 'Call type not found' });
    }
    
    // If not global and not admin, check if belongs to user's org
    if (!callType.isGlobal && !req.user.isMasterAdmin && 
        callType.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(callType);
  } catch (error) {
    console.error('Error fetching call type:', error);
    res.status(500).json({ message: 'Failed to fetch call type' });
  }
});

// Create a new call type (admin only)
router.post('/', isOrgAdmin, async (req, res) => {
  try {
    const { code, name, description, promptTemplate, jsonStructure, isGlobal } = req.body;
    
    // Check if call type with this code already exists
    const query = { code: code.toLowerCase() };
    if (isGlobal) {
      query.isGlobal = true;
    } else if (!req.user.isMasterAdmin) {
      query.organizationId = req.user.organizationId;
    }
    
    const existing = await CallType.findOne(query);
    if (existing) {
      return res.status(400).json({ message: 'A call type with this code already exists' });
    }
    
    // Create new call type
    const newCallType = new CallType({
      code,
      name,
      description,
      promptTemplate,
      jsonStructure: jsonStructure || {},
      isGlobal: req.user.isMasterAdmin ? (isGlobal || false) : false,
      organizationId: isGlobal ? null : req.user.organizationId,
      createdBy: req.user.userId
    });
    
    await newCallType.save();
    res.status(201).json(newCallType);
  } catch (error) {
    console.error('Error creating call type:', error);
    res.status(500).json({ message: 'Failed to create call type' });
  }
});

// Update a call type (admin only)
router.put('/:id', isOrgAdmin, async (req, res) => {
  try {
    const { name, description, promptTemplate, jsonStructure, active } = req.body;
    
    const callType = await CallType.findById(req.params.id);
    if (!callType) {
      return res.status(404).json({ message: 'Call type not found' });
    }
    
    // Only master admin can update global call types
    if (callType.isGlobal && !req.user.isMasterAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if user has access to this call type
    if (!callType.isGlobal && !req.user.isMasterAdmin && 
        callType.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Update fields
    if (name) callType.name = name;
    if (description !== undefined) callType.description = description;
    if (promptTemplate) callType.promptTemplate = promptTemplate;
    if (jsonStructure) callType.jsonStructure = jsonStructure;
    if (active !== undefined) callType.active = active;
    
    await callType.save();
    res.json(callType);
  } catch (error) {
    console.error('Error updating call type:', error);
    res.status(500).json({ message: 'Failed to update call type' });
  }
});

// Delete (deactivate) a call type (admin only)
router.delete('/:id', isOrgAdmin, async (req, res) => {
  try {
    const callType = await CallType.findById(req.params.id);
    if (!callType) {
      return res.status(404).json({ message: 'Call type not found' });
    }
    
    // Only master admin can delete global call types
    if (callType.isGlobal && !req.user.isMasterAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if user has access to this call type
    if (!callType.isGlobal && !req.user.isMasterAdmin && 
        callType.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Soft delete - just mark as inactive
    callType.active = false;
    await callType.save();
    
    res.json({ message: 'Call type deleted successfully' });
  } catch (error) {
    console.error('Error deleting call type:', error);
    res.status(500).json({ message: 'Failed to delete call type' });
  }
});

module.exports = router; 