	import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: (failureCount, error) => {
				// Don't retry on 401/403 (auth errors)
				if (error?.response?.status === 401 || error?.response?.status === 403) {
					return false;
				}
				// Retry network and 5xx errors up to 3 times
				if (error?.code === 'ECONNABORTED' || 
					error?.code === 'ECONNRESET' || 
					(error?.response && error?.response?.status >= 500)) {
					return failureCount < 3;
				}
				// Default behavior - retry up to 1 times for other errors
				return failureCount < 1;
			},
			retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
			staleTime: 30 * 1000, // 30 seconds (reduced from 1 minute)
			cacheTime: 10 * 60 * 1000, // 10 minutes
			refetchOnMount: true, // Always refetch when component mounts
			refetchOnWindowFocus: true, // Refetch when window regains focus for real-time updates
			refetchOnReconnect: true, // Refetch when reconnecting after network loss
			onError: (error) => {
				console.error("Query error:", error);
				// Check for authentication errors that should redirect to login
				if (error?.response?.status === 401) {
					console.log("Authentication error, redirecting to login");
					// Allow components to handle auth errors
				}
			}
		},
		mutations: {
			retry: (failureCount, error) => {
				// Retry network errors up to 2 times for mutations
				if (error?.code === 'ECONNABORTED' || error?.code === 'ECONNRESET') {
					return failureCount < 2;
				}
				// Don't retry other errors for mutations
				return false;
			},
			onError: (error) => {
				console.error("Mutation error:", error);
			}
		}
	}
});

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<BrowserRouter>
			<QueryClientProvider client={queryClient}>
				<App />
				{import.meta.env.MODE === "development" && <ReactQueryDevtools initialIsOpen={false} />}
			</QueryClientProvider>
		</BrowserRouter>
	</React.StrictMode>
);
