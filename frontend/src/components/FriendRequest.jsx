import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

const FriendRequest = ({ request }) => {
	const queryClient = useQueryClient();

	const { mutate: acceptConnectionRequest } = useMutation({
		mutationFn: (requestId) => axiosInstance.put(`/connections/accept/${requestId}`),
		onSuccess: () => {
			toast.success("Connection request accepted");
			
			// Immediately invalidate all affected queries to ensure UI consistency
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			
			// Also invalidate the connection status for this specific user
			if (request && request.sender && request.sender._id) {
				queryClient.invalidateQueries({ queryKey: ["connectionStatus", request.sender._id] });
			}
		},
		onError: (error) => {
			toast.error(error.response?.data?.error || "An error occurred");
		},
	});

	const { mutate: rejectConnectionRequest } = useMutation({
		mutationFn: (requestId) => axiosInstance.put(`/connections/reject/${requestId}`),
		onSuccess: () => {
			toast.success("Connection request rejected");
			
			// Immediately invalidate all affected queries to ensure UI consistency
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			
			// Also invalidate the connection status for this specific user
			if (request && request.sender && request.sender._id) {
				queryClient.invalidateQueries({ queryKey: ["connectionStatus", request.sender._id] });
			}
		},
		onError: (error) => {
			toast.error(error.response?.data?.error || "An error occurred");
		},
	});

	return (
		<div className='bg-white rounded-lg shadow p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between transition-all hover:shadow-md gap-3 sm:gap-0'>
			<div className='flex items-center gap-3 sm:gap-4 w-full sm:w-auto'>
				<Link to={`/profile/${request.sender.username}`}>
					<img
						src={request.sender.profilePicture || "/avatar.png"}
						alt={request.name}
						className='w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover'
					/>
				</Link>

				<div className='min-w-0 flex-1'>
					<Link to={`/profile/${request.sender.username}`} className='font-semibold text-base sm:text-lg block truncate'>
						{request.sender.name}
					</Link>
					<p className='text-gray-600 text-sm truncate'>{request.sender.headline}</p>
				</div>
			</div>

			<div className='flex gap-2 w-full sm:w-auto justify-end'>
				<button
					onClick={() => acceptConnectionRequest(request._id)}
					className='px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-white rounded text-sm sm:text-base hover:bg-primary-dark flex-1 sm:flex-none'
				>
					Accept
				</button>
				<button
					onClick={() => rejectConnectionRequest(request._id)}
					className='px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded text-sm sm:text-base hover:bg-gray-100 flex-1 sm:flex-none'
				>
					Reject
				</button>
			</div>
		</div>
	);
};

export default FriendRequest;
