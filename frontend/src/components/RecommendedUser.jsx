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
			queryClient.invalidateQueries({ queryKey: ["connectionStatus", user._id] });
		},
		onError: (error) => {
			toast.error(error.response?.data?.error || "An error occurred");
		},
	});

	const { mutate: acceptRequest } = useMutation({
		mutationFn: (requestId) => axiosInstance.put(`/connections/accept/${requestId}`),
		onSuccess: () => {
			toast.success("Connection request accepted");
			queryClient.invalidateQueries({ queryKey: ["connectionStatus", user._id] });
		},
		onError: (error) => {
			toast.error(error.response?.data?.error || "An error occurred");
		},
	});

	const { mutate: rejectRequest } = useMutation({
		mutationFn: (requestId) => axiosInstance.put(`/connections/reject/${requestId}`),
		onSuccess: () => {
			toast.success("Connection request rejected");
			queryClient.invalidateQueries({ queryKey: ["connectionStatus", user._id] });
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
					label: "Founder",
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

		switch (connectionStatus?.data?.status) {
			case "pending":
				return (
					<button
						className='px-3 py-1.5 rounded-full text-sm bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 flex items-center gap-1.5'
						disabled
					>
						<Clock size={14} />
						Pending
					</button>
				);
			case "received":
				return (
					<div className='flex gap-2'>
						<button
							onClick={() => acceptRequest(connectionStatus.data.requestId)}
							className='rounded-full p-1.5 flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors'
							title="Accept request"
						>
							<Check size={14} />
						</button>
						<button
							onClick={() => rejectRequest(connectionStatus.data.requestId)}
							className='rounded-full p-1.5 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors'
							title="Reject request"
						>
							<X size={14} />
						</button>
					</div>
				);
			case "connected":
				return (
					<button
						className='px-3 py-1.5 rounded-full text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex items-center gap-1.5'
						disabled
					>
						<UserCheck size={14} />
						Connected
					</button>
				);
			default:
				return (
					<button
						className='px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5'
						onClick={handleConnect}
					>
						<UserPlus size={14} />
						Connect
					</button>
				);
		}
	};

	const handleConnect = () => {
		if (connectionStatus?.data?.status === "not_connected") {
			sendConnectionRequest(user._id);
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
					<div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${roleInfo.bgColor} border border-white dark:border-gray-800`}>
						{roleInfo.icon}
					</div>
				</div>
				<div className="ml-3">
					<h3 className='font-semibold text-sm text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-primary/80 transition-colors'>{user.name}</h3>
					<div className={`flex items-center text-xs ${roleInfo.textColor} mt-0.5`}>
						{roleInfo.label}
					</div>
					{user.headline && (
						<p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1'>{user.headline}</p>
					)}
				</div>
			</Link>
			{renderButton()}
		</div>
	);
};
export default RecommendedUser;
