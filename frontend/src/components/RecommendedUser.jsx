import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Check, Clock, UserCheck, UserPlus, X, Briefcase, User, TrendingUp } from "lucide-react";

const RecommendedUser = ({ user }) => {
	const queryClient = useQueryClient();

	const { data: connectionStatus, isLoading } = useQuery({
		queryKey: ["connectionStatus", user._id],
		queryFn: () => axiosInstance.get(`/connections/status/${user._id}`),
	});

	const { mutate: sendConnectionRequest } = useMutation({
		mutationFn: (userId) => axiosInstance.post(`/connections/request/${userId}`),
		onSuccess: () => {
			toast.success("Connection request sent successfully");
			
			// Immediately update the local connection status to show "pending" without waiting for refetch
			queryClient.setQueryData(["connectionStatus", user._id], {
				data: {
					status: "pending_sender",
					requestId: null
				}
			});
			
			// Invalidate queries to ensure data consistency
			queryClient.invalidateQueries({ queryKey: ["connectionStatus", user._id] });
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
		onError: (error) => {
			toast.error(error.response?.data?.error || "An error occurred");
		},
	});

	const { mutate: acceptRequest } = useMutation({
		mutationFn: (requestId) => axiosInstance.put(`/connections/accept/${requestId}`),
		onSuccess: () => {
			toast.success("Connection request accepted");
			
			// Immediately update the local connection status to show "connected"
			queryClient.setQueryData(["connectionStatus", user._id], {
				data: {
					status: "connected",
					requestId: null
				}
			});
			
			// Optimistically update the connections count for both users
			// 1. Update this user's connection count
			const authUserData = queryClient.getQueryData(["authUser"]);
			if (authUserData) {
				// Clone the current user data
				const updatedAuthUser = { 
					...authUserData, 
					connections: [...(authUserData.connections || []), user._id] 
				};
				// Update the cached data
				queryClient.setQueryData(["authUser"], updatedAuthUser);
			}
			
			// 2. Update the target user's connection count
			const updatedUser = { 
				...user, 
				connections: [...(user.connections || []), authUserData?._id] 
			};
			
			// Update the user data in recommendedUsers query cache
			const recommendedUsersData = queryClient.getQueryData(["recommendedUsers", authUserData?.userRole]);
			if (recommendedUsersData) {
				const updatedRecommendedUsers = recommendedUsersData.map(u => 
					u._id === user._id ? updatedUser : u
				);
				queryClient.setQueryData(["recommendedUsers", authUserData?.userRole], updatedRecommendedUsers);
			}
			
			// Invalidate queries to ensure data consistency
			queryClient.invalidateQueries({ queryKey: ["connectionStatus", user._id] });
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({ queryKey: ["recommendedUsers"] });
		},
		onError: (error) => {
			toast.error(error.response?.data?.error || "An error occurred");
		},
	});

	const { mutate: rejectRequest } = useMutation({
		mutationFn: (requestId) => axiosInstance.put(`/connections/reject/${requestId}`),
		onSuccess: () => {
			toast.success("Connection request rejected");
			
			// Immediately update the local connection status to show "none" (not connected)
			queryClient.setQueryData(["connectionStatus", user._id], {
				data: {
					status: "none",
					requestId: null
				}
			});
			
			// Invalidate queries to ensure data consistency
			queryClient.invalidateQueries({ queryKey: ["connectionStatus", user._id] });
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
		onError: (error) => {
			toast.error(error.response?.data?.error || "An error occurred");
		},
	});

	const { mutate: withdrawRequest } = useMutation({
		mutationFn: () => axiosInstance.delete(`/connections/request/${user._id}`),
		onSuccess: () => {
			toast.success("Connection request withdrawn");
			
			// Immediately update the local connection status to show "none"
			queryClient.setQueryData(["connectionStatus", user._id], {
				data: {
					status: "none",
					requestId: null
				}
			});
			
			// Invalidate queries to ensure data consistency
			queryClient.invalidateQueries({ queryKey: ["connectionStatus", user._id] });
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
		onError: (error) => {
			toast.error(error.response?.data?.error || "An error occurred");
		},
	});

	// Get role icon and formatted role name
	const getRoleInfo = () => {
		switch(user.userRole) {
			case "founder":
				return { 
					icon: <Briefcase size={12} className="text-blue-500" />,
					label: "Startup",
					bgColor: "bg-blue-50 dark:bg-blue-900/20",
					textColor: "text-blue-700 dark:text-blue-300"
				};
			case "investor":
				return { 
					icon: <TrendingUp size={12} className="text-green-500" />,
					label: "Investor",
					bgColor: "bg-green-50 dark:bg-green-900/20",
					textColor: "text-green-700 dark:text-green-300"
				};
			case "job_seeker":
				return { 
					icon: <User size={12} className="text-purple-500" />,
					label: "Job Seeker",
					bgColor: "bg-purple-50 dark:bg-purple-900/20",
					textColor: "text-purple-700 dark:text-purple-300"
				};
			default:
				return { 
					icon: null,
					label: "",
					bgColor: "bg-gray-50 dark:bg-gray-800",
					textColor: "text-gray-700 dark:text-gray-300"
				};
		}
	};

	const roleInfo = getRoleInfo();

	const renderButton = () => {
		if (isLoading) {
			return (
				<button className='px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 animate-pulse' disabled>
					Loading...
				</button>
			);
		}

		if (!connectionStatus) {
			return null;
		}

		console.log("Connection status for", user.name, ":", connectionStatus.data);

		const status = connectionStatus.data.status;
		const requestId = connectionStatus.data.requestId;

		switch (status) {
			case "connected":
				return (
					<button className='px-3 py-1.5 rounded-full text-sm bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 flex items-center gap-1' disabled>
						<UserCheck size={14} />
						<span>Connected</span>
					</button>
				);

			case "pending_recipient":
				return (
					<div className="flex space-x-1">
						<button 
							onClick={() => acceptRequest(requestId)}
							className='p-1.5 rounded-full bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors'
							title="Accept request"
						>
							<Check size={16} />
						</button>
						<button 
							onClick={() => rejectRequest(requestId)}
							className='p-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors'
							title="Reject request"
						>
							<X size={16} />
						</button>
					</div>
				);

			case "pending_sender":
				return (
					<button 
						onClick={() => withdrawRequest()}
						className='px-3 py-1.5 rounded-full text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1'
						title="Click to withdraw request"
					>
						<Clock size={14} />
						<span>Pending</span>
					</button>
				);

			case "none":
			default:
				return (
					<button 
						onClick={() => sendConnectionRequest(user._id)}
						className='px-3 py-1.5 rounded-full text-sm bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1'
					>
						<UserPlus size={14} />
						<span>Connect</span>
					</button>
				);
		}
	};

	return (
		<div className='flex items-center justify-between'>
			<Link to={`/profile/${user.username}`} className='flex items-center flex-grow group'>
				<div className="relative">
					<img
						src={user.profilePicture || "/avatar.png"}
						alt={user.name}
						className='w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700 group-hover:border-primary dark:group-hover:border-primary/50 transition-colors'
					/>
				</div>
				<div className="ml-3">
					<h3 className='font-semibold text-sm text-black group-hover:text-primary transition-colors'>{user.name}</h3>
					{user.headline && (
						<p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1'>{user.headline}</p>
					)}
					<div className="flex items-center mt-0.5">
						<p className='text-xs text-gray-500 dark:text-gray-400'>
							{user.connections?.length || 0} {user.connections?.length === 1 ? 'connection' : 'connections'}
						</p>
					</div>
				</div>
			</Link>
			{renderButton()}
		</div>
	);
};
export default RecommendedUser;
