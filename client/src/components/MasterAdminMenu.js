import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './MasterAdminMenu.css';

const MasterAdminMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="master-admin-menu">
      <button 
        className={`master-admin-menu-toggle ${isOpen ? 'open' : ''}`} 
        onClick={toggleMenu}
      >
        Master Admin
        <span className="dropdown-icon">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="master-admin-dropdown">
          <ul>
            <li>
              <Link to="/organizations" onClick={() => setIsOpen(false)}>
                Organizations
              </Link>
            </li>
            <li>
              <Link to="/call-types" onClick={() => setIsOpen(false)}>
                Call Types
              </Link>
            </li>
            <li>
              <Link to="/api" onClick={() => setIsOpen(false)}>
                API
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default MasterAdminMenu; 