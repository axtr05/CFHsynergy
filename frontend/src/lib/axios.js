import axios from "axios";

export const axiosInstance = axios.create({
	baseURL: import.meta.env.MODE === "development" ? "http://localhost:5000/api/v1" : "/api/v1",
	withCredentials: true,
	timeout: 30000, // Increase timeout to 30 seconds for image uploads
	headers: {
		"Content-Type": "application/json",
	},
	maxContentLength: 10 * 1024 * 1024, // 10MB max content size
	maxBodyLength: 10 * 1024 * 1024, // 10MB max body length
});

// Add request interceptor for better error handling
axiosInstance.interceptors.request.use(
	(config) => {
		return config;
	},
	(error) => {
		console.error("Request error:", error);
		return Promise.reject(error);
	}
);

// Add response interceptor with retry logic
axiosInstance.interceptors.response.use(
	(response) => {
		return response;
	},
	async (error) => {
		const originalRequest = error.config;
		
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
