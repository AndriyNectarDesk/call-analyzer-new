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
    }
    
    // Add debugging info
    console.log(`Making ${config.method.toUpperCase()} request to: ${config.baseURL}${config.url}`);
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
instance.interceptors.response.use(
  response => {
    console.log(`Received response from: ${response.config.url}`, response.status);
    return response;
  },
  error => {
    console.error('API request error:', error.message);
    return Promise.reject(error);
  }
);

export default instance; 