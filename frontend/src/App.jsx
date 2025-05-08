import { Navigate, Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "./components/layout/Layout";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import SignUpPage from "./pages/auth/SignUpPage";
import RoleSelectionPage from "./pages/auth/RoleSelectionPage";
import toast, { Toaster } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "./lib/axios";
import NotificationsPage from "./pages/NotificationsPage";
import NetworkPage from "./pages/NetworkPage";
import PostPage from "./pages/PostPage";
import ProfilePage from "./pages/ProfilePage";
import ConnectionsPage from "./pages/ConnectionsPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import UserActivityPage from "./pages/UserActivityPage";
import ProjectsPage from "./pages/ProjectsPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import EditProjectPage from "./pages/EditProjectPage";
import LandingPage from "./pages/LandingPage";
import TestPage from "./pages/TestPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import AllConnectionsPage from "./pages/AllConnectionsPage";

// Error Boundary Component for network errors
const ConnectionErrorBanner = ({ isVisible, onRetry }) => {
	if (!isVisible) return null;
	
	return (
		<div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 z-50 flex justify-between items-center">
			<div className="flex-1">
				<p className="font-medium">Connection error: Unable to reach the server</p>
				<p className="text-sm">Please check your internet connection and try again</p>
			</div>
			<button 
				onClick={onRetry} 
				className="bg-white text-red-600 px-4 py-1 rounded-md font-medium hover:bg-red-100"
			>
				Retry
			</button>
		</div>
	);
};

function App() {
	const [connectionError, setConnectionError] = useState(false);
	const [healthCheckInterval, setHealthCheckInterval] = useState(null);
	
	// Function to check server health
	const checkServerHealth = async () => {
		try {
			console.log("Attempting health check...");
			// Try multiple health check endpoints in sequence
			const endpoints = ["/health", "/v1/health", "/api/v1/health"];
			
			for (const endpoint of endpoints) {
				try {
					console.log(`Trying health endpoint: ${endpoint}`);
					const res = await axiosInstance.get(endpoint, {
						timeout: 5000, // Shorter timeout for health checks
						validateStatus: () => true // Accept any status
					});
					
					if (res.status >= 200 && res.status < 500) {
						console.log(`Server health check passed via ${endpoint}`);
						setConnectionError(false);
						if (healthCheckInterval) {
							clearInterval(healthCheckInterval);
							setHealthCheckInterval(null);
						}
						refetch();
						return true;
					}
				} catch (endpointErr) {
					console.log(`Health check failed for ${endpoint}:`, endpointErr.message);
					// Continue to next endpoint
				}
			}
			
			// Ultimate fallback - try auth/me directly
			console.log("Trying direct auth/me endpoint as final fallback");
			const authRes = await axiosInstance.get("/auth/me", {
				validateStatus: () => true,
				timeout: 5000 
			});
			
			if (authRes.status !== 0) {
				console.log("Auth endpoint health check passed");
				setConnectionError(false);
				if (healthCheckInterval) {
					clearInterval(healthCheckInterval);
					setHealthCheckInterval(null);
				}
				refetch();
				return true;
			}
			
			throw new Error("All health checks failed");
		} catch (err) {
			console.log("Server health check failed:", err.message);
			return false;
		}
	};
	
	// Start health check polling when connection error occurs
	useEffect(() => {
		if (connectionError && !healthCheckInterval) {
			// Start with an immediate check
			checkServerHealth();
			
			// Then set up interval (check every 30 seconds)
			const intervalId = setInterval(checkServerHealth, 30000);
			setHealthCheckInterval(intervalId);
			
			return () => {
				clearInterval(intervalId);
				setHealthCheckInterval(null);
			};
		}
	}, [connectionError]);
	
	// Handle global connection errors
	useEffect(() => {
		const handleOnline = () => {
			if (connectionError) {
				setConnectionError(false);
				checkServerHealth();
			}
		};
		
		// Listen for browser online status
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', () => setConnectionError(true));
		
		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', () => setConnectionError(true));
		};
	}, [connectionError]);
	
	const { data: authUser, isLoading, error, refetch } = useQuery({
		queryKey: ["authUser"],
		queryFn: async () => {
			try {
				// Try multiple auth endpoint paths in sequence with fallbacks
				const endpoints = [
					"/auth/me",                // Direct path (no prefix)
					"/api/auth/me",            // API prefix 
					"/api/v1/auth/me",         // API v1 prefix
				];
				
				// Direct axios for maximum control (no interceptors)
				const axiosConfig = {
					withCredentials: true,
					baseURL: import.meta.env.MODE === "development" ? "http://localhost:5000" : "",
					timeout: 10000
				};
				
				// Try each endpoint in sequence
				let lastError = null;
				for (const endpoint of endpoints) {
					try {
						console.log(`Trying auth endpoint: ${endpoint}`);
						const res = await axios.get(endpoint, axiosConfig);
						console.log(`Auth success with endpoint: ${endpoint}`);
						if (connectionError) setConnectionError(false);
						return res.data;
					} catch (endpointErr) {
						console.log(`Auth endpoint ${endpoint} failed:`, endpointErr.message);
						lastError = endpointErr;
						// If 401 unauthorized, no need to try further - user is not logged in
						if (endpointErr.response?.status === 401) {
							console.log('Got 401 - User not authorized');
							return null;
						}
						// Otherwise, continue to next endpoint
					}
				}
				
				// If we get here, all endpoints failed
				console.log('All auth endpoints failed');
				
				// If any endpoint returned a 401, user is not authenticated
				if (lastError?.response?.status === 401) {
					return null;
				}
				
				// For connection errors, set connection error state
				if (
					lastError?.code === 'ECONNABORTED' || 
					lastError?.code === 'ECONNRESET' || 
					!lastError?.response
				) {
					setConnectionError(true);
				}
				
				throw lastError || new Error('Failed to authenticate');
			} catch (err) {
				// Handle connection errors
				if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET' || !err.response) {
					setConnectionError(true);
					throw err; // Let React Query handle retries
				}
				
				// If not a 401, show error toast
				if (err.response?.status !== 401) {
					toast.error(err.response?.data?.message || "Something went wrong");
				}
				
				throw err;
			}
		},
		retry: 3,
		retryDelay: attempt => Math.min(attempt * 1000, 5000),
		refetchOnWindowFocus: false,
	});

	// Handle error retry
	const handleRetry = () => {
		toast.loading("Reconnecting...");
		refetch()
			.then(() => toast.dismiss())
			.catch(() => {
				toast.dismiss();
				toast.error("Still unable to connect. Please try again later.");
			});
	};

	if (isLoading) {
		return (
			<div className="h-screen w-full flex items-center justify-center">
				<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
			</div>
		);
	}

	// Redirect to role selection if user is authenticated but hasn't selected a role
	const needsRoleSelection = authUser && !authUser.userRole;
	
	// Debug auth state
	console.log("Auth state:", { 
		authUser: authUser ? `User: ${authUser.username}` : 'No user', 
		needsRoleSelection,
		isLoading
	});

	// Special case for role selection - track if we need to bypass protection
	const isDirectlyAfterSignup = sessionStorage.getItem('justSignedUp') === 'true';

	return (
		<>
			<ConnectionErrorBanner 
				isVisible={connectionError} 
				onRetry={handleRetry} 
			/>
			
		<Layout>
			<Routes>
					<Route 
						path='/' 
						element={
							authUser 
								? needsRoleSelection 
									? <Navigate to="/role-selection" /> 
									: <HomePage />
								: <LandingPage />
						} 
					/>
					<Route 
						path='/signup' 
						element={
							!authUser 
								? (
									<SignUpPage 
										onSignupSuccess={() => {
											sessionStorage.setItem('justSignedUp', 'true');
										}} 
									/>
								) 
								: <Navigate to={"/"} />
						} 
					/>
				<Route path='/login' element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
					<Route 
						path='/role-selection' 
						element={<RoleSelectionPage />}
					/>
					<Route path='/notifications' element={authUser ? <NotificationsPage /> : <Navigate to={"/"} />} />
					<Route path='/network' element={authUser ? <NetworkPage /> : <Navigate to={"/"} />} />
					<Route path='/recommendations' element={authUser ? <RecommendationsPage /> : <Navigate to={"/"} />} />
					<Route 
						path='/all-connections' 
						element={
							authUser 
								? (authUser.userRole === "job_seeker" ? <AllConnectionsPage /> : <Navigate to={"/"} />)
								: <Navigate to={"/"} />
						}
					/>
					<Route path='/post/:postId' element={authUser ? <PostPage /> : <Navigate to={"/"} />} />
					<Route path='/profile/:username' element={authUser ? <ProfilePage /> : <Navigate to={"/"} />} />
					<Route path='/profile/:username/activity' element={authUser ? <UserActivityPage /> : <Navigate to={"/"} />} />
					<Route path='/connections/:username' element={authUser ? <ConnectionsPage /> : <Navigate to={"/"} />} />
					<Route path='/connections/:username/:type' element={authUser ? <ConnectionsPage /> : <Navigate to={"/"} />} />
					<Route path='/search' element={authUser ? <SearchResultsPage /> : <Navigate to={"/"} />} />
					
					{/* Project Routes */}
					<Route path='/projects' element={authUser ? <ProjectsPage /> : <Navigate to={"/"} />} />
					<Route 
						path='/projects/create' 
						element={
							authUser 
								? (authUser.userRole === "founder" ? <CreateProjectPage /> : <Navigate to={"/projects"} />)
								: <Navigate to={"/"} />
						} 
					/>
					<Route path='/projects/:projectId' element={authUser ? <ProjectDetailPage /> : <Navigate to={"/"} />} />
					<Route path='/projects/:projectId/edit' element={authUser ? <EditProjectPage /> : <Navigate to={"/"} />} />
					
					{/* Test route for footer visibility */}
					<Route path='/test' element={<TestPage />} />
			</Routes>
			<Toaster />
		</Layout>
		</>
	);
}

export default App;
