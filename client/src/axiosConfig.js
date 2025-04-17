import axios from 'axios';

// First try to get the API URL from environment variables,
// otherwise use the render.com URL
const apiBaseUrl = process.env.REACT_APP_API_URL || 'https://call-analyzer-api.onrender.com';

// Create a custom axios instance with the base URL
const instance = axios.create({
  baseURL: apiBaseUrl
});

// Add request interceptor to include auth token in all requests
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      
      // Also check token expiration (JWT tokens have an exp claim)
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiry = payload.exp * 1000; // Convert to milliseconds
          const now = Date.now();
          
          if (expiry < now) {
            console.warn('Token has expired, clearing local storage');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('selectedOrganization');
            window.location.href = '/login'; // Redirect to login
            return config;
          }
        }
      } catch (err) {
        console.error('Error checking token expiration:', err);
      }
    }
    
    // Add debugging info
    console.log(`Making ${config.method.toUpperCase()} request to: ${config.baseURL}${config.url}`);
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging and handling auth errors
instance.interceptors.response.use(
  response => {
    console.log(`Received response from: ${response.config.url}`, response.status);
    return response;
  },
  error => {
    console.error('API request error:', error.message);
    
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      console.warn('Authentication error, redirecting to login');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('selectedOrganization');
      window.location.href = '/login'; // Redirect to login
    }
    
    return Promise.reject(error);
  }
);

export default instance; 