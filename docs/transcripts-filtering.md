# Transcript Filtering Implementation

This document explains how the "Transcripts History" page implements multi-tenant access control and filtering to determine which transcripts are displayed.

## Overview

The "Transcripts History" page follows the application's tenant isolation pattern while providing additional filtering capabilities:

1. Organization-based filtering (primary tenant isolation)
2. Date range filtering
3. Text search filtering
4. Pagination

## Frontend Implementation

### Organization Selection

```javascript
// From TranscriptsHistoryPage.js
const fetchTranscriptsForOrganization = async (organization, token) => {
  // Get organization ID
  const orgId = organization._id || organization.id;
  
  // Create headers configuration with organization context
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-organization-id': orgId,
      'x-organization-name': organization.name || 'Unknown',
      'x-organization-is-master': (organization.isMaster || currentUser?.isMasterAdmin) ? 'true' : 'false'
    }
  };
  
  // Add organization filter for master org if a specific organization is selected
  if ((organization.isMaster || currentUser?.isMasterAdmin) && selectedOrg !== 'all') {
    url += `&organizationId=${selectedOrg}`;
    // Also update the header to prioritize this selection
    config.headers['x-organization-id'] = selectedOrg;
  }
  
  // Make API request with organization context
  const response = await axios.get(url, config);
}
```

### Date Range Filtering

```javascript
// Add date filters if provided
if (dateRange.startDate) {
  url += `&startDate=${dateRange.startDate}`;
}

if (dateRange.endDate) {
  url += `&endDate=${dateRange.endDate}`;
}
```

### Client-side Search Filtering

```javascript
// Filter transcripts based on search term
useEffect(() => {
  if (searchTerm.trim() === '') {
    setFilteredTranscripts(transcripts);
  } else {
    const lowercasedTerm = searchTerm.toLowerCase();
    const filtered = transcripts.filter(transcript => {
      const searchableText = [
        transcript.analysis?.callSummary?.briefSummary || '',
        transcript.callType || '',
        transcript.source || '',
        transcript.metadata?.title || '',
        transcript.organizationId?.name || ''
      ].map(text => String(text).toLowerCase()).join(' ');
      
      return searchableText.includes(lowercasedTerm);
    });
    setFilteredTranscripts(filtered);
  }
}, [searchTerm, transcripts]);
```

## Backend Implementation

### Transcript Routes

```javascript
// All routes require authentication
router.use(authenticateJWT);

// Add organization context handling middleware
router.use(handleOrganizationContext);

// Add tenant isolation middleware
router.use(tenantIsolation);

// Get all transcripts with pagination and filtering
router.get('/', transcriptController.getAllTranscripts);
```

### Tenant Isolation in Controller

```javascript
exports.getAllTranscripts = async (req, res) => {
  try {
    // Get organization context from middleware
    const organizationId = req.tenantId || req.user.organizationId;
    let isMasterOrg = req.isMasterOrg || false;
    
    // Check if this is the master organization
    if (!isMasterOrg && organizationId) {
      try {
        const organization = await Organization.findById(organizationId);
        if (organization && organization.isMaster === true) {
          isMasterOrg = true;
        }
      } catch (err) {
        console.error('Error checking if organization is master:', err);
      }
    }
    
    // Build query based on organization context
    let query = {};
    
    // If master organization, allow all transcripts by default
    if (isMasterOrg) {
      // Empty query = all transcripts
    } else {
      // For regular users, restrict to their organization
      query.organizationId = organizationId;
    }
    
    // Add additional filters (date range, etc.)
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Execute query with pagination
    const transcripts = await Transcript.find(query)
      .populate('organizationId', 'name code isMaster')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      transcripts: processedTranscripts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve transcripts' });
  }
};
```

## Key Implementation Details

1. **Organization Context Headers**: All requests include organization context headers
2. **Middleware Chain**: 
   - `authenticateJWT` → `handleOrganizationContext` → `tenantIsolation`
3. **Context Override**: Master admin in master org can override context to see specific org's data
4. **Client-side Filtering**: Search filtering happens on client for performance
5. **Server-side Filtering**: Date range and organization filtering on server for security

## Testing Scenarios

1. **Master Admin viewing all organizations**: Should see all transcripts
2. **Master Admin selecting specific organization**: Should only see that org's transcripts
3. **Regular User**: Should only see transcripts from their organization
4. **Date Range Filtering**: Should filter correctly for all user types
5. **Search Filtering**: Should filter correctly based on text content 