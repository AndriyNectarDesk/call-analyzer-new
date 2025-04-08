import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function CallTypeManager() {
  const [callTypes, setCallTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentCallType, setCurrentCallType] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    promptTemplate: '',
    jsonStructure: {
      callSummary: {},
      instructions: ''
    }
  });
  
  // Load call types
  useEffect(() => {
    const fetchCallTypes = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/call-types`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch call types');
        }
        
        const data = await response.json();
        setCallTypes(data);
      } catch (err) {
        setError('Error loading call types');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCallTypes();
  }, []);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle JSON structure changes
  const handleJsonChange = (e) => {
    const { name, value } = e.target;
    if (name === 'instructions') {
      setFormData({
        ...formData,
        jsonStructure: {
          ...formData.jsonStructure,
          instructions: value
        }
      });
    } else if (name.startsWith('callSummary.')) {
      const fieldName = name.split('.')[1];
      setFormData({
        ...formData,
        jsonStructure: {
          ...formData.jsonStructure,
          callSummary: {
            ...formData.jsonStructure.callSummary,
            [fieldName]: value
          }
        }
      });
    }
  };
  
  // Add a new field to the callSummary structure
  const addSummaryField = () => {
    const fieldName = prompt('Enter field name:');
    if (fieldName && fieldName.trim()) {
      setFormData({
        ...formData,
        jsonStructure: {
          ...formData.jsonStructure,
          callSummary: {
            ...formData.jsonStructure.callSummary,
            [fieldName.trim()]: ''
          }
        }
      });
    }
  };
  
  // Remove a field from the callSummary structure
  const removeSummaryField = (fieldName) => {
    const updatedCallSummary = { ...formData.jsonStructure.callSummary };
    delete updatedCallSummary[fieldName];
    
    setFormData({
      ...formData,
      jsonStructure: {
        ...formData.jsonStructure,
        callSummary: updatedCallSummary
      }
    });
  };
  
  // Submit the form to create or update a call type
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const url = isEditing 
        ? `${apiUrl}/api/call-types/${currentCallType._id}`
        : `${apiUrl}/api/call-types`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      // Include API key for authenticated routes
      const apiKey = prompt('Enter API key for authorization:');
      if (!apiKey) return;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save call type');
      }
      
      const data = await response.json();
      
      if (isEditing) {
        // Update in the list
        setCallTypes(callTypes.map(ct => 
          ct._id === currentCallType._id ? data : ct
        ));
      } else {
        // Add to the list
        setCallTypes([...callTypes, data]);
      }
      
      // Reset form
      resetForm();
      
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };
  
  // Delete/deactivate a call type
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this call type?')) {
      return;
    }
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      // Include API key for authenticated routes
      const apiKey = prompt('Enter API key for authorization:');
      if (!apiKey) return;
      
      const response = await fetch(`${apiUrl}/api/call-types/${id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate call type');
      }
      
      // Remove from the list
      setCallTypes(callTypes.filter(ct => ct._id !== id));
      
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };
  
  // Edit a call type
  const handleEdit = (callType) => {
    setIsEditing(true);
    setCurrentCallType(callType);
    
    // Convert callSummary Map to object if needed
    const callSummaryObj = typeof callType.jsonStructure.callSummary.get === 'function'
      ? Object.fromEntries(callType.jsonStructure.callSummary)
      : callType.jsonStructure.callSummary;
    
    setFormData({
      code: callType.code,
      name: callType.name,
      description: callType.description || '',
      promptTemplate: callType.promptTemplate,
      jsonStructure: {
        callSummary: callSummaryObj || {},
        instructions: callType.jsonStructure.instructions || ''
      }
    });
  };
  
  // Reset the form
  const resetForm = () => {
    setIsEditing(false);
    setCurrentCallType(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      promptTemplate: '',
      jsonStructure: {
        callSummary: {},
        instructions: ''
      }
    });
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading call types...</p>
      </div>
    );
  }

  return (
    <div className="calltype-manager-container">
      <div className="calltype-header">
        <h2>Call Types Manager</h2>
        <Link to="/" className="back-button">Back to Analyzer</Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="calltype-content">
        <div className="calltype-list">
          <h3>Available Call Types</h3>
          {callTypes.length === 0 ? (
            <p>No call types defined yet.</p>
          ) : (
            <ul className="calltype-items">
              {callTypes.map(callType => (
                <li key={callType._id} className="calltype-item">
                  <div className="calltype-info">
                    <h4>{callType.name}</h4>
                    <div className="calltype-code">Code: {callType.code}</div>
                    {callType.description && (
                      <p className="calltype-description">{callType.description}</p>
                    )}
                  </div>
                  <div className="calltype-actions">
                    <button 
                      className="edit-button"
                      onClick={() => handleEdit(callType)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDelete(callType._id)}
                    >
                      Deactivate
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          
          <button 
            className="new-calltype-button"
            onClick={resetForm}
          >
            Add New Call Type
          </button>
        </div>
        
        <div className="calltype-form-container">
          <h3>{isEditing ? 'Edit Call Type' : 'Create New Call Type'}</h3>
          <form onSubmit={handleSubmit} className="calltype-form">
            <div className="form-group">
              <label htmlFor="code">Code:</label>
              <input 
                type="text" 
                id="code" 
                name="code" 
                value={formData.code}
                onChange={handleInputChange}
                required
                disabled={isEditing}
              />
              <small>Unique identifier used in API calls</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="name">Name:</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description:</label>
              <textarea 
                id="description" 
                name="description" 
                value={formData.description}
                onChange={handleInputChange}
                rows="2"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="promptTemplate">JSON Template:</label>
              <textarea 
                id="promptTemplate" 
                name="promptTemplate" 
                value={formData.promptTemplate}
                onChange={handleInputChange}
                rows="10"
                required
                placeholder="Enter the JSON structure template that Claude should use"
              />
              <small>
                The JSON structure that Claude will use as a template. 
                Make sure it includes agentName and relevant fields.
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="instructions">Instructions:</label>
              <textarea 
                id="instructions" 
                name="instructions" 
                value={formData.jsonStructure.instructions}
                onChange={handleJsonChange}
                rows="3"
                placeholder="Instructions for Claude to understand the call type context"
              />
            </div>
            
            <div className="form-group">
              <label>Call Summary Fields:</label>
              <div className="summary-fields">
                {Object.keys(formData.jsonStructure.callSummary).length === 0 ? (
                  <p>No fields defined. Click 'Add Field' to add call summary fields.</p>
                ) : (
                  Object.entries(formData.jsonStructure.callSummary).map(([key, value]) => (
                    <div key={key} className="summary-field">
                      <label>{key}:</label>
                      <input 
                        type="text" 
                        name={`callSummary.${key}`}
                        value={value}
                        onChange={handleJsonChange}
                        placeholder="Field description"
                      />
                      <button 
                        type="button" 
                        className="remove-field-button"
                        onClick={() => removeSummaryField(key)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
                <button 
                  type="button" 
                  className="add-field-button"
                  onClick={addSummaryField}
                >
                  Add Field
                </button>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="save-button">
                {isEditing ? 'Update Call Type' : 'Create Call Type'}
              </button>
              <button 
                type="button" 
                className="cancel-button"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CallTypeManager; 