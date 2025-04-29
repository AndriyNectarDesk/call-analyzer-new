# Multi-Tenant Access Control

This document describes the tenant isolation and organization context control system used throughout the application.

## Core Concepts

### 1. User Roles & Context

- **Master Admin**: Has potential access to all organizations but operates within an organization context
- **Organization Admin**: Has access only to their specific organization
- **Regular User**: Access limited to their organization

### 2. Tenant Isolation

All data access in the application is filtered through a tenant isolation system. This ensures that even users with higher privileges (like Master Admins) only access data for the organization context they're currently operating in.

### 3. Organization Context Switching

- Master Admins can switch between organization contexts
- The active organization context is determined by:
  1. The `x-organization-id` header (highest priority)
  2. The user's default organization (fallback)

## Implementation Details

### Headers for Organization Context

```
'x-organization-id': '[organization-id]'
'x-organization-name': '[organization-name]'
'x-organization-is-master': 'true'|'false'
```

### Middleware Flow

1. `authenticateJWT`: Authenticates the user from the JWT token
2. `handleOrganizationContext`: Sets the organization context based on headers
3. `tenantIsolation`: Adds organization filter to all database queries

### Query Building Pattern

```javascript
// Build query based on organization context
let query = {};

// If master organization context with specific org selected
if (isMasterOrg && selectedOrg !== 'all') {
  query.organizationId = selectedOrg;
}
// If not master org context, restrict to current org
else if (!isMasterOrg) {
  query.organizationId = organizationId;
}
// If master org with "all" selected, no filter needed
```

## Best Practices for New Features

1. **Always Use Tenant Isolation**: Wrap all data access through the tenant isolation middleware
   
2. **Context Headers**: Include organization context headers in all API requests
   
3. **UI Organization Selection**: Allow master admins to select organizations from a dropdown
   
4. **Query Building Pattern**: Follow the query building pattern for MongoDB queries:
   ```javascript
   const query = {};
   if (!isMasterOrg || specificOrgSelected) {
     query.organizationId = effectiveOrgId;
   }
   ```

5. **Testing**: Test all features with both:
   - Master Admin in master organization context
   - Master Admin in specific organization context
   - Regular user in their organization

## Common Pitfalls

1. **Direct Query Without Context**: Never query the database without applying organization context filtering
2. **Assuming Master Admin Access**: Don't assume master admins can always see all data
3. **Inconsistent Header Usage**: Always use the same header pattern across API endpoints

## Example Implementation

```javascript
// Controller method with tenant isolation
exports.getSomeResource = async (req, res) => {
  try {
    // Organization ID comes from tenant isolation middleware
    const organizationId = req.tenantId;
    const isMasterOrg = req.isMasterOrg || false;
    const selectedOrg = req.query.organizationId;
    
    // Build query based on context
    let query = {};
    if ((isMasterOrg || req.user.isMasterAdmin) && selectedOrg && selectedOrg !== 'all') {
      // Master admin with specific org selected
      query.organizationId = selectedOrg;
    } else if (!isMasterOrg && !req.user.isMasterAdmin) {
      // Regular user - strict organization isolation
      query.organizationId = organizationId;
    }
    
    // Add other filters
    if (req.query.someFilter) {
      query.someField = req.query.someFilter;
    }
    
    // Execute query with tenant isolation
    const resources = await Resource.find(query);
    
    res.json({ resources });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving resources' });
  }
};
``` 