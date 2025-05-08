import axios from "axios";
import toast from "react-hot-toast";

// Determine the API base URL based on environment
const getBaseUrl = () => {
	// Development environment
	if (import.meta.env.MODE === "development") {
		return "http://localhost:5000";
	}
	
	// Production environment - use the API endpoint on the same domain
	return "";
};

export const axiosInstance = axios.create({
	baseURL: getBaseUrl(),
	withCredentials: true,
	timeout: 30000, // Increase timeout to 30 seconds for image uploads
	headers: {
		"Content-Type": "application/json",
	},
	maxContentLength: 10 * 1024 * 1024, // 10MB max content size
	maxBodyLength: 10 * 1024 * 1024, // 10MB max body length
});

// Add request interceptor for better error handling and logging
axiosInstance.interceptors.request.use(
	(config) => {
		// Add /api/v1 prefix to ensure consistent API paths
		if (!config.url.startsWith('/api/v1') && !config.url.startsWith('http')) {
			config.url = `/api/v1${config.url}`;
		}
		
		console.log(`REQUEST: ${config.method.toUpperCase()} ${config.url}`, 
			config.data ? { data: config.data } : '');
		return config;
	},
	(error) => {
		console.error("Request error:", error);
		return Promise.reject(error);
	}
);

// Add response interceptor with retry logic and better logging
axiosInstance.interceptors.response.use(
	(response) => {
		console.log(`RESPONSE: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`, 
			{ data: response.data });
		return response;
	},
	async (error) => {
		const originalRequest = error.config;
		
		// Special handling for MongoDB connection errors (503 Service Unavailable)
		if (error.response?.status === 503) {
			console.error('Database connection error detected:', {
				url: originalRequest.url,
				method: originalRequest.method,
				status: error.response?.status,
				data: error.response?.data
			});
			
			// For login/register endpoints, show specific message
			if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/register')) {
				toast.error("Database connection issue. Please try again in a few moments.");
				return Promise.reject(error);
			}
			
			// For other endpoints, retry after a delay if not already retried
			if (!originalRequest._retry) {
				originalRequest._retry = true;
				await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
				console.log('Retrying request after database connection error...');
				return axiosInstance(originalRequest);
			}
		}
		
		// Special handling for like post errors
		if (originalRequest.url.includes('/like') && error.response?.status === 500) {
			console.error('Detected 500 error on like endpoint:', {
				url: originalRequest.url,
				method: originalRequest.method,
				status: error.response?.status,
				data: error.response?.data,
				message: error.message
			});
			
			// Return failed request without retry for like endpoint 500 errors
			return Promise.reject(error);
		}
		
		// Log the error details
		console.error(`API Error: ${originalRequest.method.toUpperCase()} ${originalRequest.url}`, {
			status: error.response?.status,
			statusText: error.response?.statusText,
			data: error.response?.data,
			message: error.message
		});
		
		// Only retry idempotent methods (GET, PUT, DELETE, etc.) Not POST
		// And only retry once (no infinite loops)
		if (
			error.code === 'ECONNABORTED' || 
			error.code === 'ECONNRESET' || 
			(error.response && error.response.status >= 500) &&
			originalRequest.method !== 'post' && 
			!originalRequest._retry
		) {
			originalRequest._retry = true;
			
			// Wait for 1 second before retrying
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			console.log('Retrying request after connection error...');
			return axiosInstance(originalRequest);
		}
		
		return Promise.reject(error);
	}
);

// Export a method to get the full URL for debugging
export const getFullUrl = (path) => {
	return `${getBaseUrl()}${path.startsWith('/api/v1') ? path : `/api/v1${path}`}`;
};
