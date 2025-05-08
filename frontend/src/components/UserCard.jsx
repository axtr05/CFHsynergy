import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { UserCheck, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

function UserCard({ user, isConnection }) {
	const queryClient = useQueryClient();
	
	const { mutate: sendConnectionRequest } = useMutation({
		mutationFn: (userId) => axiosInstance.post(`/connections/request/${userId}`),
		onSuccess: () => {
			toast.success("Connection request sent");
			// Invalidate all related queries
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			
			// Update connection status for this user
			if (user && user._id) {
				queryClient.invalidateQueries({ queryKey: ["connectionStatus", user._id] });
			}
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "An error occurred");
		},
	});
	
	const { mutate: removeConnection } = useMutation({
		mutationFn: (userId) => axiosInstance.delete(`/connections/${userId}`),
		onSuccess: (data) => {
			toast.success("Connection removed");
			
			// Immediately update the local connection status
			if (user && user._id) {
				queryClient.setQueryData(["connectionStatus", user._id], {
					data: {
						status: "none"
					}
				});
			}
			
			// Invalidate all affected queries for real-time updates
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["connectionStatus"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({ queryKey: ["mutualConnections"] });
			
			// Update auth user data to reflect new connection count if available
			const authUser = queryClient.getQueryData(["authUser"]);
			if (authUser && Array.isArray(authUser.connections)) {
				queryClient.setQueryData(["authUser"], {
					...authUser,
					connections: authUser.connections.filter(id => id !== user._id)
				});
			}
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "An error occurred");
		},
	});

	const handleConnectionAction = () => {
		if (isConnection) {
			// If already connected, allow disconnecting
			removeConnection(user._id);
		} else {
			// If not connected, send connection request
			sendConnectionRequest(user._id);
		}
	};

	const connectionButtonText = isConnection ? "Connected" : "Connect";
	const connectionButtonIcon = isConnection ? <UserCheck size={16} className="mr-1.5" /> : <UserPlus size={16} className="mr-1.5" />;
	const connectionButtonClass = isConnection
		? "bg-gray-200 hover:bg-red-100 text-gray-800 hover:text-red-600 border border-gray-300"
		: "bg-primary hover:bg-primary-dark text-white";

	return (
		<div className="bg-white rounded-lg shadow p-3 sm:p-4 flex flex-col h-full">
			<div className="flex items-start sm:items-center mb-3 gap-2 sm:gap-3">
				<Link to={`/profile/${user.username}`} className="flex-shrink-0">
					<img
						src={user.profilePicture || "/avatar.png"}
						alt={user.name}
						className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
					/>
				</Link>
				<div className="min-w-0 flex-1">
					<Link to={`/profile/${user.username}`} className="font-semibold text-primary hover:underline block truncate">
						{user.name}
					</Link>
					<p className="text-gray-600 text-xs sm:text-sm truncate">{user.headline || "No headline"}</p>
				</div>
			</div>
			
			<div className="mt-auto pt-3 flex flex-wrap justify-between items-center gap-2">
				<span className="text-xs text-gray-500">
					{Array.isArray(user.connections) ? user.connections.length : 0} connections
				</span>
				<button
					onClick={handleConnectionAction}
					className={`py-1 sm:py-1.5 px-3 sm:px-4 rounded-md transition duration-300 flex items-center justify-center font-medium text-xs sm:text-sm ${connectionButtonClass} w-full sm:w-auto mt-2 sm:mt-0`}
				>
					{connectionButtonIcon}
					{connectionButtonText}
				</button>
			</div>
		</div>
	);
}

export default UserCard;
