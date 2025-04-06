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
			queryClient.invalidateQueries(["connections"]);
			queryClient.invalidateQueries(["connectionRequests"]);
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "An error occurred");
		},
	});
	
	const { mutate: removeConnection } = useMutation({
		mutationFn: (userId) => axiosInstance.delete(`/connections/${userId}`),
		onSuccess: () => {
			toast.success("Connection removed");
			queryClient.invalidateQueries(["connections"]);
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

	return (
		<div className='bg-white rounded-lg shadow-md p-5 flex flex-col items-center transition-all hover:shadow-lg'>
			<Link to={`/profile/${user.username}`} className='flex flex-col items-center'>
				<img
					src={user.profilePicture || "/avatar.png"}
					alt={user.name}
					className='w-24 h-24 rounded-full object-cover mb-4 border-2 border-gray-100'
				/>
				<h3 className='font-semibold text-lg text-center'>{user.name}</h3>
			</Link>
			
			{user.headline && (
				<p className='text-gray-600 text-center text-sm mt-1 mb-2 line-clamp-2'>{user.headline}</p>
			)}
			
			<div className="bg-gray-50 px-3 py-1 rounded-full mt-1 mb-3 flex items-center text-sm">
				<Link to={`/connections/${user.username}`} className="text-gray-600 hover:text-primary">
					{user.connections?.length || 0} connections
				</Link>
			</div>
			
			<button 
				onClick={handleConnectionAction}
				className={`mt-2 px-4 py-2 rounded-md transition-colors w-full flex items-center justify-center font-medium text-sm ${
					isConnection 
						? 'border border-primary text-primary hover:bg-red-50 hover:text-red-600 hover:border-red-600' 
						: 'bg-primary text-white hover:bg-primary-dark'
				}`}
			>
				{isConnection ? (
					<>
						<UserCheck size={16} className='mr-2' />
						Connected
					</>
				) : (
					<>
						<UserPlus size={16} className='mr-2' />
						Connect
					</>
				)}
			</button>
		</div>
	);
}

export default UserCard;
