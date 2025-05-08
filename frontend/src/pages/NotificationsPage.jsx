import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";
import { 
	ExternalLink, 
	Eye, 
	MessageSquare, 
	ThumbsUp, 
	Trash2, 
	UserPlus, 
	UserX, 
	UserCheck,
	CheckCircle,
	XCircle,
	AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { formatDistanceToNow } from "date-fns";
import { useAuthUser } from "../utils/authHooks";

const NotificationsPage = () => {
	const queryClient = useQueryClient();
	const { data: authUser } = useAuthUser();

	const { data: notifications, isLoading } = useQuery({
		queryKey: ["notifications"],
		queryFn: () => axiosInstance.get("/notifications"),
		refetchOnWindowFocus: true,
		refetchInterval: 30000, // Check for new notifications every 30 seconds
	});

	const { mutate: markAsReadMutation } = useMutation({
		mutationFn: (id) => axiosInstance.put(`/notifications/${id}/read`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
	});

	const { mutate: deleteNotificationMutation } = useMutation({
		mutationFn: (id) => axiosInstance.delete(`/notifications/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			toast.success("Notification deleted");
		},
	});
	
	const { mutate: markAllAsReadMutation } = useMutation({
		mutationFn: () => axiosInstance.put('/notifications/read-all'),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			toast.success("All notifications marked as read");
		}
	});

	// Add debug reset notifications function
	const { mutate: resetNotifications, isLoading: isResetting } = useMutation({
		mutationFn: () => axiosInstance.post('/notifications/reset'),
		onSuccess: (data) => {
			toast.success(`Notifications reset: ${data.count} notifications created`);
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
		onError: (error) => {
			toast.error("Failed to reset notifications");
			console.error("Reset error:", error);
		}
	});

	const renderNotificationIcon = (type) => {
		switch (type) {
			case "post_like":
				return <ThumbsUp className='text-blue-500' />;
			case "post_comment":
				return <MessageSquare className='text-green-500' />;
			case "connection_request":
				return <UserPlus className='text-indigo-500' />;
			case "connection_accepted":
				return <UserCheck className='text-purple-500' />;
			case "connection_rejected":
				return <XCircle className='text-red-500' />;
			case "connection_removed":
				return <UserX className='text-orange-500' />;
			case "project_comment":
				return <MessageSquare className='text-cyan-500' />;
			case "project_upvote":
				return <ThumbsUp className='text-emerald-500' />;
			case "application_accepted":
				return <CheckCircle className='text-green-500' />;
			case "application_rejected":
				return <XCircle className='text-red-500' />;
			case "application_rejected_auto":
				return <XCircle className='text-orange-500' />;
			case "application_cancelled":
				return <AlertCircle className='text-amber-500' />;
			case "team_member_left":
				return <UserX className='text-red-500' />;
			default:
				return <CheckCircle className='text-gray-500' />;
		}
	};

	const renderNotificationContent = (notification) => {
		switch (notification.type) {
			case "post_like":
				return (
					<span>
						<Link to={`/profile/${notification.sender.username}`} className='font-bold hover:underline'>
							{notification.sender.name}
						</Link>{" "}
						liked your post
					</span>
				);
			case "post_comment":
				return (
					<span>
						<Link to={`/profile/${notification.sender.username}`} className='font-bold hover:underline'>
							{notification.sender.name}
						</Link>{" "}
						commented on your post
					</span>
				);
			case "connection_request":
				return (
					<span>
						<Link to={`/profile/${notification.sender.username}`} className='font-bold hover:underline'>
							{notification.sender.name}
						</Link>{" "}
						sent you a connection request
					</span>
				);
			case "connection_accepted":
				return (
					<span>
						<Link to={`/profile/${notification.sender.username}`} className='font-bold hover:underline'>
							{notification.sender.name}
						</Link>{" "}
						accepted your connection request
					</span>
				);
			case "connection_rejected":
				return (
					<span>
						<Link to={`/profile/${notification.sender.username}`} className='font-bold hover:underline'>
							{notification.sender.name}
						</Link>{" "}
						declined your connection request
					</span>
				);
			case "connection_removed":
				return (
					<span>
						<Link to={`/profile/${notification.sender.username}`} className='font-bold hover:underline'>
							{notification.sender.name}
						</Link>{" "}
						removed connection with you
					</span>
				);
			case "project_comment":
				return (
					<span>
						<Link to={`/profile/${notification.sender.username}`} className='font-bold hover:underline'>
							{notification.sender.name}
						</Link>{" "}
						commented on your project
					</span>
				);
			case "project_upvote":
				return (
					<span>
						<Link to={`/profile/${notification.sender.username}`} className='font-bold hover:underline'>
							{notification.sender.name}
						</Link>{" "}
						upvoted your project
					</span>
				);
			case "application_accepted":
				return (
					<span>
						Your application for a role in{" "}
						<Link to={`/projects/${notification.project?._id}`} className='font-bold hover:underline'>
							{notification.project?.name || "a project"}
						</Link>{" "}
						has been accepted
					</span>
				);
			case "application_rejected":
			case "application_rejected_auto":
				return (
					<span>
						Your application for a role in{" "}
						<Link to={`/projects/${notification.project?._id}`} className='font-bold hover:underline'>
							{notification.project?.name || "a project"}
						</Link>{" "}
						has been rejected
					</span>
				);
			case "application_cancelled":
				return (
					<span>
						{notification.content || "Your application for a role has been cancelled"}
					</span>
				);
			case "team_member_left":
				return (
					<span>
						A team member has left your project{" "}
						<Link to={`/projects/${notification.project?._id}`} className='font-bold hover:underline'>
							{notification.project?.name || ""}
						</Link>
					</span>
				);
			default:
				if (notification.content) {
					return <span>{notification.content}</span>;
				}
				return (
					<span>
						<Link to={`/profile/${notification.sender?.username}`} className='font-bold hover:underline'>
							{notification.sender?.name || "Someone"}
						</Link>{" "}
						interacted with your profile
					</span>
				);
		}
	};

	const renderRelatedContent = (notification) => {
		if (notification.post) {
			return (
				<Link
					to={`/post/${notification.post._id}`}
					className='mt-2 p-2 bg-gray-50 rounded-md flex items-center space-x-2 hover:bg-gray-100 transition-colors'
				>
					{notification.post.image && (
						<img src={notification.post.image} alt='Post preview' className='w-10 h-10 object-cover rounded' />
					)}
					<div className='flex-1 overflow-hidden'>
						<p className='text-sm text-gray-600 truncate'>{notification.post.content}</p>
					</div>
					<ExternalLink size={14} className='text-gray-400' />
				</Link>
			);
		} else if (notification.project) {
			return (
				<Link
					to={`/projects/${notification.project._id}`}
					className='mt-2 p-2 bg-gray-50 rounded-md flex items-center space-x-2 hover:bg-gray-100 transition-colors'
				>
					{notification.project.poster && (
						<img src={notification.project.poster} alt='Project preview' className='w-10 h-10 object-cover rounded' />
					)}
					<div className='flex-1 overflow-hidden'>
						<p className='text-sm text-gray-600 font-medium'>{notification.project.name}</p>
						<p className='text-xs text-gray-500 truncate'>{notification.project.description}</p>
					</div>
					<ExternalLink size={14} className='text-gray-400' />
				</Link>
			);
		}
		
		return null;
	};

	return (
		<div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
			<div className='col-span-1 lg:col-span-1'>
				<Sidebar user={authUser} />
			</div>
			<div className='col-span-1 lg:col-span-3'>
				<div className='bg-white rounded-lg shadow p-6'>
					<div className="flex items-center justify-between mb-6">
						<h1 className='text-2xl font-bold'>Notifications</h1>
						
						<div className="flex gap-3">
							{/* Only show in development */}
							{process.env.NODE_ENV !== 'production' && (
								<button 
									onClick={() => resetNotifications()}
									disabled={isResetting}
									className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 py-1 px-2 rounded"
								>
									Reset (Debug)
								</button>
							)}
							
							{notifications?.data?.filter(n => !n.read).length > 0 && (
								<button 
									onClick={() => markAllAsReadMutation()}
									className="text-sm text-primary hover:text-primary-dark font-medium"
								>
									Mark all as read
								</button>
							)}
						</div>
					</div>

					{isLoading ? (
						<div className='text-center p-8'>
							<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4'></div>
							<p className='text-gray-600'>Loading notifications...</p>
						</div>
					) : notifications?.data?.length > 0 ? (
						<div className='space-y-4'>
							{notifications.data.map((notification) => (
								<div
									key={notification._id}
									className={`rounded-lg ${
										notification.read ? "bg-gray-50" : "bg-blue-50"
									} p-4 flex items-start transition-colors`}
								>
									<div className='flex-shrink-0 mr-4 mt-1'>
										<div className='rounded-full bg-white p-2 shadow-sm'>
											{renderNotificationIcon(notification.type)}
										</div>
									</div>
									<div className='flex-1'>
										<div className='flex items-start justify-between'>
											<div>
												<p className='text-gray-800'>{renderNotificationContent(notification)}</p>
												<p className='text-sm text-gray-500 mt-1'>
													{formatDistanceToNow(new Date(notification.createdAt), {
														addSuffix: true,
													})}
												</p>
												{renderRelatedContent(notification)}
											</div>
											<div className='flex space-x-2'>
												{!notification.read && (
													<button
														onClick={() => markAsReadMutation(notification._id)}
														className='text-blue-600 hover:text-blue-800'
														title='Mark as read'
													>
														<Eye size={16} />
													</button>
												)}
												<button
													onClick={() => deleteNotificationMutation(notification._id)}
													className='text-red-500 hover:text-red-700'
													title='Delete'
												>
													<Trash2 size={16} />
												</button>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className='text-center p-8 bg-gray-50 rounded-lg'>
							<p className='text-gray-600'>No notifications yet</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default NotificationsPage;
