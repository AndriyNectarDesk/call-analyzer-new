import React from 'react';

/**
 * Component to display detailed information from Nectar Desk webhook calls
 */
function NectarDeskDetails({ callDetails }) {
  if (!callDetails) {
    return null;
  }

  return (
    <div className="nectar-desk-details">
      <h3 style={{ 
        display: 'flex',
        alignItems: 'center', 
        marginBottom: '15px',
        color: '#2980b9'
      }}>
        <i className="fa fa-phone" style={{ marginRight: '8px' }}></i> 
        Nectar Desk Call Details
      </h3>

      <div className="call-details-grid">
        {/* Call Basic Info */}
        <div className="call-details-section">
          <h4>Call Information</h4>
          <div className="detail-row">
            <div className="detail-label">Call ID</div>
            <div className="detail-value">{callDetails.callId || 'N/A'}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Direction</div>
            <div className="detail-value">
              {callDetails.callDirection === 'inbound' ? (
                <span className="tag tag-inbound">Inbound</span>
              ) : callDetails.callDirection === 'outbound' ? (
                <span className="tag tag-outbound">Outbound</span>
              ) : (
                'Unknown'
              )}
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Status</div>
            <div className="detail-value">{callDetails.callStatus || 'N/A'}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Duration</div>
            <div className="detail-value">
              {callDetails.duration ? `${callDetails.duration} seconds` : 'N/A'}
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Talk Time</div>
            <div className="detail-value">
              {callDetails.talkTime ? `${callDetails.talkTime} seconds` : 'N/A'}
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Waiting Time</div>
            <div className="detail-value">
              {callDetails.waitingTime ? `${callDetails.waitingTime} seconds` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Call Timing */}
        <div className="call-details-section">
          <h4>Call Timing</h4>
          <div className="detail-row">
            <div className="detail-label">Started</div>
            <div className="detail-value">
              {callDetails.startedDate ? new Date(callDetails.startedDate).toLocaleString() : 'N/A'}
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Ended</div>
            <div className="detail-value">
              {callDetails.endedDate ? new Date(callDetails.endedDate).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>

        {/* Phone Number */}
        {callDetails.number && (
          <div className="call-details-section">
            <h4>Phone Number</h4>
            <div className="detail-row">
              <div className="detail-label">Number</div>
              <div className="detail-value">
                {callDetails.number.number || 'N/A'}
              </div>
            </div>
            {callDetails.number.alias && (
              <div className="detail-row">
                <div className="detail-label">Alias</div>
                <div className="detail-value">
                  {callDetails.number.alias}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer Info */}
        {callDetails.customer && (
          <div className="call-details-section">
            <h4>Customer Information</h4>
            <div className="detail-row">
              <div className="detail-label">Name</div>
              <div className="detail-value">
                {callDetails.customer.firstName && callDetails.customer.lastName ? 
                  `${callDetails.customer.firstName} ${callDetails.customer.lastName}` : 
                  callDetails.customer.firstName || callDetails.customer.lastName || 'N/A'}
              </div>
            </div>
            {callDetails.customer.email && (
              <div className="detail-row">
                <div className="detail-label">Email</div>
                <div className="detail-value">{callDetails.customer.email}</div>
              </div>
            )}
            {callDetails.customer.phone && (
              <div className="detail-row">
                <div className="detail-label">Phone</div>
                <div className="detail-value">{callDetails.customer.phone}</div>
              </div>
            )}
          </div>
        )}

        {/* Agent Info */}
        {callDetails.agent && (
          <div className="call-details-section">
            <h4>Agent Information</h4>
            <div className="detail-row">
              <div className="detail-label">Name</div>
              <div className="detail-value">{callDetails.agent.name || 'N/A'}</div>
            </div>
            {callDetails.agent.action && (
              <div className="detail-row">
                <div className="detail-label">Action</div>
                <div className="detail-value">{callDetails.agent.action}</div>
              </div>
            )}
            {callDetails.agent.type && (
              <div className="detail-row">
                <div className="detail-label">Type</div>
                <div className="detail-value">{callDetails.agent.type}</div>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {callDetails.tags && callDetails.tags.length > 0 && (
          <div className="call-details-section">
            <h4>Tags</h4>
            <div className="tags-container">
              {callDetails.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NectarDeskDetails; 