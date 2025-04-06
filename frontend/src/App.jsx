import { Navigate, Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "./components/layout/Layout";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import SignUpPage from "./pages/auth/SignUpPage";
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

	return (
		<>
			<ConnectionErrorBanner 
				isVisible={connectionError} 
				onRetry={handleRetry} 
			/>
			
			<Layout>
				<Routes>
					<Route path='/' element={authUser ? <HomePage /> : <Navigate to={"/login"} />} />
					<Route path='/signup' element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />} />
					<Route path='/login' element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
					<Route path='/notifications' element={authUser ? <NotificationsPage /> : <Navigate to={"/login"} />} />
					<Route path='/network' element={authUser ? <NetworkPage /> : <Navigate to={"/login"} />} />
					<Route path='/post/:postId' element={authUser ? <PostPage /> : <Navigate to={"/login"} />} />
					<Route path='/profile/:username' element={authUser ? <ProfilePage /> : <Navigate to={"/login"} />} />
					<Route path='/profile/:username/activity' element={authUser ? <UserActivityPage /> : <Navigate to={"/login"} />} />
					<Route path='/connections/:username' element={authUser ? <ConnectionsPage /> : <Navigate to={"/login"} />} />
					<Route path='/connections/:username/:type' element={authUser ? <ConnectionsPage /> : <Navigate to={"/login"} />} />
					<Route path='/search' element={authUser ? <SearchResultsPage /> : <Navigate to={"/login"} />} />
				</Routes>
				<Toaster />
			</Layout>
		</>
	);
}

export default App;
