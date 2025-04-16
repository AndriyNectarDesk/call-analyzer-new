import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext({
  user: null,
  organization: null,
  setUser: () => {},
  setOrganization: () => {},
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      const orgData = localStorage.getItem('selectedOrganization');
      if (orgData) {
        setOrganization(JSON.parse(orgData));
      }
    } catch (error) {
      console.error('Error initializing user context from localStorage:', error);
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, organization, setOrganization }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider; 