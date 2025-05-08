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
			const res = await axiosInstance.get("/api/v1/health");
			if (res.status === 200) {
				console.log("Server health check passed");
				setConnectionError(false);
				// Clear health check interval if connection is restored
				if (healthCheckInterval) {
					clearInterval(healthCheckInterval);
					setHealthCheckInterval(null);
				}
				// Refresh data
				refetch();
				return true;
			}
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
				const res = await axiosInstance.get("/auth/me");
				// If we got a successful response, clear any connection error state
				if (connectionError) setConnectionError(false);
				return res.data;
			} catch (err) {
				// Handle auth errors separately from connection errors
				if (err.response && err.response.status === 401) {
					return null;
				}
				
				// Handle connection errors
				if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET' || !err.response) {
					setConnectionError(true);
					throw err; // Let React Query handle retries
				}
				
				toast.error(err.response?.data?.message || "Something went wrong");
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
