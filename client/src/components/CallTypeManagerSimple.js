import React, { useState } from 'react';
import './CallTypeManager.css';

function CallTypeManagerSimple() {
  // Sample data based on what's visible in the screenshot
  const callTypes = [
    {
      _id: '1',
      name: 'Dymon Storage',
      code: 'dymon',
      description: ''
    },
    {
      _id: '2',
      name: 'Flower Shop',
      code: 'flower',
      description: 'Calls related to flower shops, handling orders, deliveries, and floral arrangements'
    },
    {
      _id: '3',
      name: 'Hearing Aid Clinic',
      code: 'hearing',
      description: 'Calls related to hearing aid clinics, appointments, and hearing device inquiries'
    }
  ];

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder for form submission
    console.log('Form submitted:', formData);
  };

  return (
    <div className="calltype-manager-container">
      <div className="calltype-header">
        <h2>Call Types Manager</h2>
      </div>
      
      <div className="calltype-content">
        <div className="calltype-list">
          <h3>Available Call Types</h3>
          
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
                  <button className="edit-button">Edit</button>
                  <button className="delete-button">Deactivate</button>
                </div>
              </li>
            ))}
          </ul>
          
          <button className="new-calltype-button">
            Add New Call Type
          </button>
        </div>
        
        <div className="calltype-form">
          <h3>Create New Call Type</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="code">Code:</label>
              <input 
                type="text" 
                id="code" 
                name="code" 
                value={formData.code}
                onChange={handleInputChange}
                required
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
            
            <div className="form-actions">
              <button type="submit" className="save-button">
                Create Call Type
              </button>
              <button type="button" className="cancel-button">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CallTypeManagerSimple; 