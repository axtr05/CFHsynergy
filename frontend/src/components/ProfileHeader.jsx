import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import { axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { Link } from "react-router-dom";
import PostsList from "./PostsList";

import { Camera, Clock, MapPin, UserCheck, UserPlus, X, Briefcase, Mail, Link as LinkIcon, Users, CheckCircle, Phone, Linkedin, Layout, Layers, Check } from "lucide-react";

const ProfileHeader = ({ userData, onSave, isOwnProfile }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editedData, setEditedData] = useState({});
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
	const [imageSrc, setImageSrc] = useState(null);
	const [showCropper, setShowCropper] = useState(false);
	const [showContactInfo, setShowContactInfo] = useState(false);
	const [showFullAbout, setShowFullAbout] = useState(false);
	const [activeActivityTab, setActiveActivityTab] = useState("posts");
	const queryClient = useQueryClient();

	const { data: authUser } = useQuery({ 
		queryKey: ["authUser"],
		queryFn: () => axiosInstance.get('/auth/me').then(res => res.data),
	});

	const { data: connectionStatus, refetch: refetchConnectionStatus } = useQuery({
		queryKey: ["connectionStatus", userData?._id],
		queryFn: () => axiosInstance.get(`/connections/status/${userData?._id}`),
		enabled: !isOwnProfile && !!userData?._id,
	});

	const { data: mutualConnections } = useQuery({
		queryKey: ["mutualConnections", userData?._id],
		queryFn: () => axiosInstance.get(`/connections/mutual/${userData?._id}`),
		enabled: !isOwnProfile && !!userData?._id,
	});

	// Fetch user's projects
	const { data: userProjects, isLoading: isLoadingProjects } = useQuery({
		queryKey: ["userProjects", userData?._id],
		queryFn: async () => {
			const response = await axiosInstance.get(`/projects/user/${userData?._id}`);
			return response.data;
		},
		enabled: !!userData?._id,
	});

	// If userData is undefined or incomplete, don't try to render the component
	if (!userData) {
		return null;
	}

	const isConnected = userData?.connections?.some((connection) => connection === authUser?._id);
	const mutualConnectionsCount = mutualConnections?.data?.length || 0;

	const { mutate: sendConnectionRequest } = useMutation({
		mutationFn: (userId) => axiosInstance.post(`/connections/request/${userId}`),
		onSuccess: () => {
			toast.success("Connection request sent");
			refetchConnectionStatus();
			queryClient.invalidateQueries(["connectionRequests"]);
		},
		onError: (error) => {
			toast.error(error?.response?.data?.message || "An error occurred");
		},
	});

	const { mutate: acceptRequest } = useMutation({
		mutationFn: (requestId) => axiosInstance.put(`/connections/accept/${requestId}`),
		onSuccess: () => {
			toast.success("Connection request accepted");
			refetchConnectionStatus();
			
			// Invalidate all affected queries for real-time updates
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			
			// Refetch user data to update connections count
			if (userData && userData._id) {
				queryClient.invalidateQueries({ queryKey: ["user", userData.username] });
			}
			
			// Update auth user
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "An error occurred");
		},
	});

	const { mutate: rejectRequest } = useMutation({
		mutationFn: (requestId) => axiosInstance.put(`/connections/reject/${requestId}`),
		onSuccess: () => {
			toast.success("Connection request rejected");
			refetchConnectionStatus();
			
			// Invalidate all affected queries for real-time updates
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			
			// Clear connection status cache
			if (userData && userData._id) {
				queryClient.setQueryData(["connectionStatus", userData._id], {
					data: {
						status: "none"
					}
				});
			}
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "An error occurred");
		},
	});

	const { mutate: removeConnection } = useMutation({
		mutationFn: (userId) => axiosInstance.delete(`/connections/${userId}`),
		onSuccess: () => {
			toast.success("Connection removed");
			refetchConnectionStatus();
			
			// Invalidate all affected queries for real-time updates
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({ queryKey: ["mutualConnections"] });
			
			// Update the user profile data to reflect new connection count
			if (userData && userData._id) {
				queryClient.invalidateQueries({ queryKey: ["user", userData.username] });
				
				// Clear connection status cache
				queryClient.setQueryData(["connectionStatus", userData._id], {
					data: {
						status: "none"
					}
				});
			}
			
			// Update auth user data to reflect new connection count
			const authUser = queryClient.getQueryData(["authUser"]);
			if (authUser && userData && authUser.connections && Array.isArray(authUser.connections)) {
				queryClient.setQueryData(["authUser"], {
					...authUser,
					connections: authUser.connections.filter(id => id !== userData._id)
				});
			}
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "An error occurred");
		},
	});

	const { mutate: withdrawRequest } = useMutation({
		mutationFn: () => axiosInstance.delete(`/connections/request/${userData._id}`),
		onSuccess: () => {
			toast.success("Connection request withdrawn");
			refetchConnectionStatus();
			queryClient.invalidateQueries(["connectionRequests"]);
			queryClient.invalidateQueries(["recommendedUsers"]);
		},
		onError: (error) => {
			toast.error(error.response?.data?.error || "An error occurred");
		},
	});

	// Should only show mutual connections if the user is not the profile owner
	const showMutualConnections = useMemo(() => {
		return !isOwnProfile && mutualConnectionsCount > 0;
	}, [isOwnProfile, mutualConnectionsCount]);
	
	// Should only show the current institution if it exists
	const showCurrentInstitution = useMemo(() => {
		return userData?.experience?.length > 0;
	}, [userData?.experience]);

	// Get current institution
	const getCurrentInstitution = () => {
		if (!userData.experience || userData.experience.length === 0) {
			return null;
		}
	
		// Find the most recent experience that doesn't have an end date (current)
		const currentExperience = userData.experience.find(exp => !exp.endDate);
		return currentExperience || userData.experience[0]; // Return the most recent if none is current
	};

	const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
		setCroppedAreaPixels(croppedAreaPixels);
	}, []);

	const handleImageChange = (event) => {
		const file = event.target.files[0];
		const inputName = event.target.name; // 'profilePicture' or 'bannerImg'
		
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				if (inputName === 'profilePicture') {
					setImageSrc(reader.result);
					setShowCropper(true);
				} else {
					setEditedData(prev => ({ ...prev, bannerImg: reader.result }));
				}
			};
			reader.readAsDataURL(file);
		}
	};

	const handleCropComplete = async () => {
		if (croppedAreaPixels && imageSrc) {
			try {
				const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
				setEditedData(prev => ({ ...prev, profilePicture: croppedImage }));
				setShowCropper(false);
				setImageSrc(null);
				setCroppedAreaPixels(null);
			} catch (error) {
				toast.error('Failed to process image');
				console.error('Error cropping image:', error);
			}
		}
	};

	const handleSave = () => {
		const loadingToast = toast.loading("Saving profile...");
		try {
			console.log("Saving profile data:", editedData);
			onSave(editedData, true);
		setIsEditing(false);
			toast.dismiss(loadingToast);
			toast.success("Profile saved successfully");
		} catch (error) {
			console.error("Error saving profile:", error);
			toast.dismiss(loadingToast);
			toast.error("Failed to save profile");
		}
	};

	const renderConnectionButton = () => {
		const baseClass = "py-1.5 px-4 rounded-md transition duration-300 flex items-center justify-center font-medium text-sm";
		
		if (!connectionStatus || !connectionStatus.data) {
			return (
				<button 
					onClick={() => sendConnectionRequest(userData._id)}
					className={`${baseClass} bg-primary hover:bg-primary-dark text-white`}
				>
					<UserPlus size={16} className='mr-1.5' />
					Connect
				</button>
			);
		}
		
		const status = connectionStatus.data.status;
		const requestId = connectionStatus.data.requestId;
		
		switch (status) {
			case "connected":
				return (
					<button
						className={`${baseClass} bg-gray-200 hover:bg-red-100 text-gray-800 hover:text-red-600 border border-gray-300`}
						onClick={() => removeConnection(userData._id)}
					>
						<UserCheck size={16} className='mr-1.5' />
						Connected
					</button>
				);

			case "pending_sender":
				return (
					<button 
						onClick={() => withdrawRequest()}
						className={`${baseClass} bg-blue-50 text-blue-700 hover:bg-blue-100 border border-gray-300`}
						title="Click to withdraw request"
					>
						<Clock size={16} className='mr-1.5' />
						Pending
					</button>
				);

			case "pending_recipient":
				return (
					<div className='flex gap-2 justify-center'>
						<button
							onClick={() => acceptRequest(requestId)}
							className={`${baseClass} bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border border-gray-300`}
						>
							<Check size={16} className='mr-1.5' />
							Accept
						</button>
						<button
							onClick={() => rejectRequest(requestId)}
							className={`${baseClass} bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-gray-300`}
						>
							<X size={16} className='mr-1.5' />
							Reject
						</button>
					</div>
				);
			
			case "none":
			default:
				return (
					<button
						onClick={() => sendConnectionRequest(userData._id)}
						className={`${baseClass} bg-primary hover:bg-primary-dark text-white`}
					>
						<UserPlus size={16} className='mr-1.5' />
						Connect
					</button>
				);
		}
	};

	return (
		<div className='bg-white shadow-md rounded-xl overflow-hidden mb-6'>
			{/* Banner with dark overlay */}
			<div
				className='relative h-48 lg:h-64 bg-cover bg-center'
				style={{
					backgroundImage: `url('${editedData.bannerImg || userData.bannerImg || "/banner.png"}')`,
					backgroundColor: '#333',
				}}
			>
				<div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"></div>
				{isEditing && (
					<label className='absolute bottom-4 right-4 bg-white/90 p-2 rounded-full shadow-md cursor-pointer hover:bg-white z-10'>
						<Camera size={20} />
						<input
							type='file'
							className='hidden'
							name='bannerImg'
							onChange={handleImageChange}
							accept='image/*'
						/>
					</label>
				)}
				
				{/* Header content with profile image only */}
				<div className="absolute bottom-0 left-0 right-0 p-6 lg:px-10">
					<div className="relative -mb-16 md:-mb-20 z-10">
						<div className="inline-block">
							<img
								className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white object-cover shadow-md bg-white"
							src={editedData.profilePicture || userData.profilePicture || "/avatar.png"}
							alt={userData.name}
						/>
						{isEditing && (
								<label className='absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md cursor-pointer hover:bg-gray-50 z-10'>
									<Camera size={16} />
								<input
									type='file'
									className='hidden'
									name='profilePicture'
									onChange={handleImageChange}
									accept='image/*'
								/>
							</label>
						)}
						</div>
					</div>
					</div>
				</div>

			{/* Profile info below profile picture - LinkedIn style */}
			<div className="px-6 lg:px-10 pt-20 md:pt-24 pb-3">
				<div className="flex flex-col md:flex-row justify-between items-start">
					<div className="flex-1">
						{/* Name with verification badge */}
						<div className="flex items-center gap-1.5 mb-1">
						{isEditing ? (
							<input
								type='text'
								value={editedData.name ?? userData.name}
								onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
									className='text-2xl font-bold border-b border-gray-300 focus:border-primary focus:outline-none py-1 w-full'
							/>
						) : (
								<h1 className='text-2xl md:text-3xl font-bold flex items-center'>
									{userData.name}
									{userData.isVerified && (
										<CheckCircle size={22} className="ml-2 text-primary-light" fill="#0a66c2" />
									)}
								</h1>
							)}
						</div>

						{/* Headline */}
						{isEditing ? (
							<input
								type='text'
								value={editedData.headline ?? userData.headline}
								onChange={(e) => setEditedData({ ...editedData, headline: e.target.value })}
								className='text-gray-700 border-b border-gray-300 focus:border-primary focus:outline-none py-1 w-full mb-3'
							/>
						) : (
							<p className='text-gray-700 text-sm md:text-base mb-2'>{userData.headline || "Upcoming Summer Intern @Microsoft | Google Girl Hackathon '25 Finalist | Knight @LeetCode | 3 ⭐ @Codechef | 8x Hackathon Winner | GSSOC '24"}</p>
						)}

						{/* Location */}
						<div className="flex items-center mb-3 text-gray-500 text-xs md:text-sm">
							<MapPin size={14} className='mr-1.5' />
							{isEditing ? (
								<input
									type='text'
									value={editedData.location ?? userData.location}
									onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
									className='border-b border-gray-300 focus:border-primary focus:outline-none py-0.5 w-full'
								/>
							) : (
								<span>{userData.location || "Hyderabad, Telangana, India"}</span>
							)}
							<span className="mx-1">·</span>
							<button 
								onClick={() => setShowContactInfo(true)}
								className='text-blue-600 hover:text-blue-800 hover:underline'
							>
								Contact info
							</button>
						</div>

						{/* Connections and mutual connections */}
						<div className='flex flex-wrap items-center gap-3 mb-4'>
							{isOwnProfile || isConnected ? (
								<Link 
									to={`/connections/${userData.username}`} 
									className='text-blue-600 text-sm font-medium hover:underline'
								>
									{userData.connections?.length || 0} Connections
								</Link>
							) : (
								<div className='text-blue-600 text-sm font-medium'>
									{userData.connections?.length || 0} Connections
								</div>
							)}
							
							{showMutualConnections && (
								<div className="flex items-center">
									<div className="flex -space-x-2 mr-2">
										<img src="/avatar.png" alt="Mutual" className="w-6 h-6 rounded-full border border-white" />
										<img src="/avatar.png" alt="Mutual" className="w-6 h-6 rounded-full border border-white" />
									</div>
									<Link 
										to={`/connections/${userData.username}/mutual`} 
										className='text-gray-600 text-sm hover:text-blue-600 hover:underline'
									>
										Mutual connections
									</Link>
								</div>
							)}
						</div>

						{/* Action buttons (connect/message) */}
						{!isEditing && !isOwnProfile && (
							<div className="mb-4">
								{renderConnectionButton()}
							</div>
						)}
					</div>
					
					{/* Organization/Institution on the right side */}
					<div className="mt-2 md:mt-0 md:ml-auto md:pl-4 flex flex-col items-end">
						{!isEditing && (
							<div className="text-right mb-3">
								{userData.organization && (
									<div className="flex items-center justify-end mb-2">
										{userData.orgLogo ? (
											<div className="w-16 h-16 mr-3 overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm">
												<img 
													src={userData.orgLogo} 
													alt={userData.organization}
													className="w-full h-full object-contain"
												/>
											</div>
										) : (
											<div className="w-16 h-16 mr-3 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
												<Briefcase size={24} className="text-gray-500" />
											</div>
										)}
										<div className="text-left">
											<span className="font-medium text-lg text-gray-800 block leading-tight">{userData.organization}</span>
											{userData.club && (
												<span className="text-sm text-gray-600 block mt-1">
													<span className="inline-flex items-center">
														<Users size={14} className="text-gray-500 mr-1.5" />
														{userData.club}
													</span>
												</span>
											)}
										</div>
									</div>
								)}
								{!userData.organization && userData.club && (
									<div className="flex items-center justify-end">
										{userData.orgLogo ? (
											<div className="w-16 h-16 mr-3 overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm">
												<img 
													src={userData.orgLogo} 
													alt={userData.club}
													className="w-full h-full object-contain"
												/>
											</div>
										) : (
											<div className="w-16 h-16 mr-3 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
												<Users size={24} className="text-gray-500" />
											</div>
										)}
										<span className="text-lg font-medium text-gray-800">{userData.club}</span>
									</div>
								)}
							</div>
						)}

						{isOwnProfile && (
							<div>
							{isEditing ? (
								<button
									onClick={handleSave}
										className='bg-primary text-white px-5 py-1.5 rounded-md hover:bg-primary-dark transition duration-300 text-sm font-medium'
									>
										Save Profile
									</button>
								) : (
									<button
										onClick={() => setIsEditing(true)}
										className='border border-primary text-primary px-5 py-1.5 rounded-md hover:bg-primary hover:text-white transition duration-300 text-sm font-medium'
									>
										Edit Profile
									</button>
								)}
							</div>
						)}
					</div>
				</div>
				
				{/* Organization and club info if in edit mode */}
				{isEditing && (
					<>
						<div className="flex flex-col md:flex-row gap-4 mb-4">
							<div className="flex-1">
								<label className="block text-xs text-gray-600 mb-1">Organization</label>
								<input
									type='text'
									value={editedData.organization ?? userData.organization}
									onChange={(e) => setEditedData({ ...editedData, organization: e.target.value })}
									placeholder="Your organization or position"
									className='border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary'
								/>
							</div>
							<div className="flex-1">
								<label className="block text-xs text-gray-600 mb-1">Club/Group</label>
								<input
									type='text'
									value={editedData.club ?? userData.club}
									onChange={(e) => setEditedData({ ...editedData, club: e.target.value })}
									placeholder="Your club or group affiliation"
									className='border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary'
								/>
							</div>
						</div>

						{/* Organization Logo Upload */}
						<div className="mb-4">
							<label className="block text-xs text-gray-600 mb-1">Organization/Club Logo</label>
							<div className="flex items-center gap-3">
								<div className="w-16 h-16 border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
									{editedData.orgLogo || userData.orgLogo ? (
										<img 
											src={editedData.orgLogo || userData.orgLogo} 
											alt="Organization Logo" 
											className="w-full h-full object-contain" 
										/>
									) : (
										<Layout size={24} className="text-gray-400" />
									)}
								</div>
								<div className="flex flex-col">
									<label className="cursor-pointer text-sm text-primary hover:text-primary-dark mb-1">
										Upload Logo
										<input
											type="file"
											className="hidden"
											accept="image/*"
											onChange={(e) => {
												const file = e.target.files[0];
												if (file) {
													toast.loading("Uploading logo...");
													const reader = new FileReader();
													reader.onloadend = () => {
														setEditedData({ ...editedData, orgLogo: reader.result });
														toast.dismiss();
														toast.success("Logo ready for upload");
													};
													reader.onerror = () => {
														toast.dismiss();
														toast.error("Failed to process logo");
													};
													reader.readAsDataURL(file);
												}
											}}
										/>
									</label>
									<span className="text-xs text-gray-500">
										Recommended: Square PNG or JPG, max 1MB
									</span>
								</div>
								{(editedData.orgLogo || userData.orgLogo) && (
									<button
										type="button"
										onClick={() => setEditedData({ ...editedData, orgLogo: '' })}
										className="text-xs text-red-500 hover:text-red-600"
									>
										Remove
									</button>
								)}
							</div>
						</div>

						{/* Contact Info Section in Edit Mode */}
						<div className="mt-4 mb-4">
							<h3 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h3>
							<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
								<div className="flex flex-col gap-3">
									{/* LinkedIn */}
									<div className="flex items-center gap-2">
										<Linkedin size={18} className="text-blue-600" />
										<div className="flex-1">
											<label className="block text-xs text-gray-600 mb-1">LinkedIn Profile URL</label>
											<input
												type='url'
												value={editedData.linkedin ?? userData.linkedin ?? ''}
												onChange={(e) => setEditedData({ ...editedData, linkedin: e.target.value })}
												placeholder="https://linkedin.com/in/your-profile"
												className='border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary'
											/>
										</div>
									</div>
									
									{/* Email */}
									<div className="flex items-center gap-2">
										<Mail size={18} className="text-blue-600" />
										<div className="flex-1">
											<label className="block text-xs text-gray-600 mb-1">Email Address</label>
											<input
												type='email'
												value={editedData.email ?? userData.email ?? ''}
												onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
												placeholder="your.email@example.com"
												className='border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary'
											/>
										</div>
									</div>
									
									{/* Phone */}
									<div className="flex items-center gap-2">
										<Phone size={18} className="text-blue-600" />
										<div className="flex-1">
											<label className="block text-xs text-gray-600 mb-1">Phone Number (optional)</label>
											<input
												type='tel'
												value={editedData.phone ?? userData.phone ?? ''}
												onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
												placeholder="+1 (123) 456-7890"
												className='border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary'
											/>
										</div>
									</div>
								</div>
								<p className="text-xs text-gray-500 mt-3">
									This information will be visible to your connections. Your phone number is optional.
								</p>
							</div>
						</div>
						
						{/* About Section in Edit Mode */}
						<div className="mt-6 mb-4">
							<h3 className="text-sm font-medium text-gray-700 mb-2">About</h3>
							<textarea
								value={editedData.about ?? userData.about ?? ''}
								onChange={(e) => setEditedData({ ...editedData, about: e.target.value })}
								placeholder="Write a summary about yourself, your background, and what you're looking for"
								className='border border-gray-300 rounded-md p-3 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary h-32 resize-none'
							/>
						</div>
						
						{/* Experience Section in Edit Mode */}
						<div className="mt-6 mb-4">
							<div className="flex justify-between items-center mb-2">
								<h3 className="text-sm font-medium text-gray-700">Experience</h3>
								<button
									type="button"
									onClick={() => {
										const newExperience = {
											title: '',
											company: '',
											startDate: '',
											endDate: '',
											description: '',
											logo: ''
										};
										setEditedData({
											...editedData,
											experience: [...(editedData.experience || userData.experience || []), newExperience]
										});
									}}
									className="text-xs text-primary hover:text-primary-dark font-medium flex items-center"
								>
									+ Add Experience
								</button>
							</div>
							<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
								{(editedData.experience || userData.experience || []).length === 0 ? (
									<p className="text-sm text-gray-500 text-center py-4">No experience added yet. Click "Add Experience" to get started.</p>
								) : (
									<div className="space-y-4">
										{(editedData.experience || userData.experience || []).map((exp, index) => (
											<div key={index} className="border border-gray-200 rounded-md p-4 bg-white relative">
												<button
													type="button"
													onClick={() => {
														const newExperience = [...(editedData.experience || userData.experience)];
														newExperience.splice(index, 1);
														setEditedData({ ...editedData, experience: newExperience });
													}}
													className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
												>
													<X size={16} />
												</button>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													<div>
														<label className="block text-xs text-gray-600 mb-1">Job Title</label>
														<input
															type="text"
															value={exp.title || ''}
															onChange={(e) => {
																const newExperience = [...(editedData.experience || userData.experience)];
																newExperience[index] = { ...newExperience[index], title: e.target.value };
																setEditedData({ ...editedData, experience: newExperience });
															}}
															placeholder="Software Engineer"
															className="border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary"
														/>
													</div>
													<div>
														<label className="block text-xs text-gray-600 mb-1">Company</label>
														<input
															type="text"
															value={exp.company || ''}
															onChange={(e) => {
																const newExperience = [...(editedData.experience || userData.experience)];
																newExperience[index] = { ...newExperience[index], company: e.target.value };
																setEditedData({ ...editedData, experience: newExperience });
															}}
															placeholder="Company Name"
															className="border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary"
														/>
													</div>
													<div>
														<label className="block text-xs text-gray-600 mb-1">Start Date</label>
														<input
															type="date"
															value={exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : ''}
															onChange={(e) => {
																const newExperience = [...(editedData.experience || userData.experience)];
																newExperience[index] = { ...newExperience[index], startDate: e.target.value };
																setEditedData({ ...editedData, experience: newExperience });
															}}
															className="border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary"
														/>
													</div>
													<div>
														<label className="block text-xs text-gray-600 mb-1">End Date (leave blank if current)</label>
														<input
															type="date"
															value={exp.endDate ? new Date(exp.endDate).toISOString().split('T')[0] : ''}
															onChange={(e) => {
																const newExperience = [...(editedData.experience || userData.experience)];
																newExperience[index] = { ...newExperience[index], endDate: e.target.value || null };
																setEditedData({ ...editedData, experience: newExperience });
															}}
															className="border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary"
														/>
													</div>
													<div className="md:col-span-2">
														<label className="block text-xs text-gray-600 mb-1">Description</label>
														<textarea
															value={exp.description || ''}
															onChange={(e) => {
																const newExperience = [...(editedData.experience || userData.experience)];
																newExperience[index] = { ...newExperience[index], description: e.target.value };
																setEditedData({ ...editedData, experience: newExperience });
															}}
															placeholder="Describe your responsibilities and achievements"
															className="border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary h-20 resize-none"
														/>
													</div>
													<div className="md:col-span-2">
														<label className="block text-xs text-gray-600 mb-1">Company Logo (optional)</label>
														<div className="flex items-center gap-3">
															<div className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center overflow-hidden bg-gray-50">
																{exp.logo ? (
																	<img src={exp.logo} alt="Logo" className="w-full h-full object-contain" />
																) : (
																	<Camera size={16} className="text-gray-400" />
																)}
															</div>
															<label className="cursor-pointer text-sm text-primary hover:text-primary-dark">
																Upload Logo
																<input
																	type="file"
																	className="hidden"
																	accept="image/*"
																	onChange={(e) => {
																		const file = e.target.files[0];
																		if (file) {
																			toast.loading("Uploading logo...");
																			const reader = new FileReader();
																			reader.onloadend = () => {
																				const newExperience = [...(editedData.experience || userData.experience)];
																				newExperience[index] = { ...newExperience[index], logo: reader.result };
																				setEditedData({ ...editedData, experience: newExperience });
																				toast.dismiss();
																				toast.success("Logo ready for upload");
																			};
																			reader.onerror = () => {
																				toast.dismiss();
																				toast.error("Failed to process logo");
																			};
																			reader.readAsDataURL(file);
																		}
																	}}
																/>
															</label>
															{exp.logo && (
																<button
																	type="button"
																	onClick={() => {
																		const newExperience = [...(editedData.experience || userData.experience)];
																		newExperience[index] = { ...newExperience[index], logo: '' };
																		setEditedData({ ...editedData, experience: newExperience });
																	}}
																	className="text-xs text-red-500 hover:text-red-600"
																>
																	Remove
																</button>
															)}
														</div>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
						
						{/* Education Section in Edit Mode */}
						<div className="mt-6 mb-4">
							<div className="flex justify-between items-center mb-2">
								<h3 className="text-sm font-medium text-gray-700">Education</h3>
								<button
									type="button"
									onClick={() => {
										const newEducation = {
											school: '',
											fieldOfStudy: '',
											startYear: '',
											endYear: '',
											logo: ''
										};
										setEditedData({
											...editedData,
											education: [...(editedData.education || userData.education || []), newEducation]
										});
									}}
									className="text-xs text-primary hover:text-primary-dark font-medium flex items-center"
								>
									+ Add Education
								</button>
							</div>
							<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
								{(editedData.education || userData.education || []).length === 0 ? (
									<p className="text-sm text-gray-500 text-center py-4">No education added yet. Click "Add Education" to get started.</p>
								) : (
									<div className="space-y-4">
										{(editedData.education || userData.education || []).map((edu, index) => (
											<div key={index} className="border border-gray-200 rounded-md p-4 bg-white relative">
												<button
													type="button"
													onClick={() => {
														const newEducation = [...(editedData.education || userData.education)];
														newEducation.splice(index, 1);
														setEditedData({ ...editedData, education: newEducation });
													}}
													className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
												>
													<X size={16} />
												</button>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													<div>
														<label className="block text-xs text-gray-600 mb-1">School/University</label>
														<input
															type="text"
															value={edu.school || ''}
															onChange={(e) => {
																const newEducation = [...(editedData.education || userData.education)];
																newEducation[index] = { ...newEducation[index], school: e.target.value };
																setEditedData({ ...editedData, education: newEducation });
															}}
															placeholder="Harvard University"
															className="border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary"
														/>
													</div>
													<div>
														<label className="block text-xs text-gray-600 mb-1">Field of Study</label>
														<input
															type="text"
															value={edu.fieldOfStudy || ''}
															onChange={(e) => {
																const newEducation = [...(editedData.education || userData.education)];
																newEducation[index] = { ...newEducation[index], fieldOfStudy: e.target.value };
																setEditedData({ ...editedData, education: newEducation });
															}}
															placeholder="Computer Science"
															className="border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary"
														/>
													</div>
													<div>
														<label className="block text-xs text-gray-600 mb-1">Start Year</label>
														<input
															type="number"
															value={edu.startYear || ''}
															onChange={(e) => {
																const newEducation = [...(editedData.education || userData.education)];
																newEducation[index] = { ...newEducation[index], startYear: e.target.value };
																setEditedData({ ...editedData, education: newEducation });
															}}
															placeholder="2018"
															min="1900"
															max="2100"
															className="border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary"
														/>
													</div>
													<div>
														<label className="block text-xs text-gray-600 mb-1">End Year (leave blank if current)</label>
														<input
															type="number"
															value={edu.endYear || ''}
															onChange={(e) => {
																const newEducation = [...(editedData.education || userData.education)];
																newEducation[index] = { ...newEducation[index], endYear: e.target.value || null };
																setEditedData({ ...editedData, education: newEducation });
															}}
															placeholder="2022"
															min="1900"
															max="2100"
															className="border border-gray-300 rounded-md p-2 text-sm w-full focus:ring-2 focus:ring-primary/20 focus:border-primary"
														/>
													</div>
													<div className="md:col-span-2">
														<label className="block text-xs text-gray-600 mb-1">School/University Logo (optional)</label>
														<div className="flex items-center gap-3">
															<div className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center overflow-hidden bg-gray-50">
																{edu.logo ? (
																	<img src={edu.logo} alt="Logo" className="w-full h-full object-contain" />
																) : (
																	<Camera size={16} className="text-gray-400" />
																)}
															</div>
															<label className="cursor-pointer text-sm text-primary hover:text-primary-dark">
																Upload Logo
																<input
																	type="file"
																	className="hidden"
																	accept="image/*"
																	onChange={(e) => {
																		const file = e.target.files[0];
																		if (file) {
																			toast.loading("Uploading logo...");
																			const reader = new FileReader();
																			reader.onloadend = () => {
																				const newEducation = [...(editedData.education || userData.education)];
																				newEducation[index] = { ...newEducation[index], logo: reader.result };
																				setEditedData({ ...editedData, education: newEducation });
																				toast.dismiss();
																				toast.success("Logo ready for upload");
																			};
																			reader.onerror = () => {
																				toast.dismiss();
																				toast.error("Failed to process logo");
																			};
																			reader.readAsDataURL(file);
																		}
																	}}
																/>
															</label>
															{edu.logo && (
																<button
																	type="button"
																	onClick={() => {
																		const newEducation = [...(editedData.education || userData.education)];
																		newEducation[index] = { ...newEducation[index], logo: '' };
																		setEditedData({ ...editedData, education: newEducation });
																	}}
																	className="text-xs text-red-500 hover:text-red-600"
																>
																	Remove
																</button>
															)}
														</div>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
						
						{/* Skills Section in Edit Mode */}
						<div className="mt-6 mb-4">
							<div className="flex justify-between items-center mb-2">
								<h3 className="text-sm font-medium text-gray-700">Skills</h3>
							</div>
							<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
								<div className="mb-3">
									<label className="block text-xs text-gray-600 mb-1">Add Skills (comma separated)</label>
									<div className="flex gap-2">
										<input
											type="text"
											id="skillInput"
											placeholder="React, Node.js, JavaScript..."
											className="border border-gray-300 rounded-md p-2 text-sm flex-1 focus:ring-2 focus:ring-primary/20 focus:border-primary"
											onKeyDown={(e) => {
												if (e.key === 'Enter' || e.key === ',') {
													e.preventDefault();
													const skillInput = e.target.value.trim();
													if (skillInput) {
														const skills = [...(editedData.skills || userData.skills || [])];
														if (!skills.includes(skillInput)) {
															setEditedData({
																...editedData,
																skills: [...skills, skillInput]
															});
															e.target.value = '';
														}
													}
												}
											}}
										/>
										<button
											type="button"
											onClick={(e) => {
												const skillInput = document.getElementById('skillInput').value.trim();
												if (skillInput) {
													const skills = [...(editedData.skills || userData.skills || [])];
													if (!skills.includes(skillInput)) {
														setEditedData({
															...editedData,
															skills: [...skills, skillInput]
														});
														document.getElementById('skillInput').value = '';
													}
												}
											}}
											className="bg-primary text-white px-3 py-2 rounded-md text-sm hover:bg-primary-dark"
										>
											Add
										</button>
									</div>
								</div>
								
								<div className="flex flex-wrap gap-2 mt-3">
									{(editedData.skills || userData.skills || []).map((skill, index) => (
										<div key={index} className="bg-gray-100 rounded-full px-3 py-1 text-sm flex items-center">
											{skill}
											<button
												type="button"
												onClick={() => {
													const newSkills = [...(editedData.skills || userData.skills)];
													newSkills.splice(index, 1);
													setEditedData({ ...editedData, skills: newSkills });
												}}
												className="ml-2 text-gray-400 hover:text-red-500"
											>
												<X size={14} />
											</button>
										</div>
									))}
									{(editedData.skills || userData.skills || []).length === 0 && (
										<p className="text-sm text-gray-500 w-full text-center py-2">No skills added yet. Type a skill and press Enter or click Add.</p>
									)}
								</div>
							</div>
						</div>
					</>
				)}
			</div>

			{/* Rest of the profile content */}
			<div className='px-6 lg:px-10 pb-5 border-t border-gray-200 pt-4'>
				{/* About section - using data from database */}
				{userData.about && (
					<div className="mb-6">
						<h2 className="text-lg font-semibold text-gray-800 mb-3">About</h2>
						<p className="text-sm text-gray-600">
							{showFullAbout ? userData.about : userData.about.length > 150 ? `${userData.about.substring(0, 150)}...` : userData.about}
						</p>
						{userData.about.length > 150 && (
							<p className="text-sm text-gray-600 mt-3">
								<button 
									onClick={() => setShowFullAbout(!showFullAbout)} 
									className="text-blue-600 cursor-pointer hover:underline"
								>
									{showFullAbout ? "see less" : "see more"}
								</button>
							</p>
						)}
					</div>
				)}
				
				{/* Experience, Education, Skills sections */}
				{userData.experience && userData.experience.length > 0 && (
					<div className="mb-6">
						<h2 className="text-lg font-semibold text-gray-800 mb-3">Experience</h2>
						{userData.experience.map((exp, index) => (
							<div key={index} className={`flex items-start gap-3 ${index > 0 ? 'mt-4' : ''}`}>
								<div className="w-10 h-10 mt-1">
									<img src={exp.logo || "/assets/company-logo.png"} alt={exp.company} className="w-full h-full object-contain bg-gray-100 rounded-full p-1" />
								</div>
								<div>
									<h3 className="text-sm font-semibold">{exp.title}</h3>
									<p className="text-xs text-gray-600">{exp.company}</p>
									<p className="text-xs text-gray-500 mt-1">
										{new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
										{exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}
										{` · ${exp.endDate ? Math.floor((new Date(exp.endDate) - new Date(exp.startDate)) / (1000 * 60 * 60 * 24 * 30)) : Math.floor((new Date() - new Date(exp.startDate)) / (1000 * 60 * 60 * 24 * 30))} mos`}
									</p>
									{exp.description && <p className="text-xs text-gray-600 mt-1">{exp.description}</p>}
								</div>
							</div>
						))}
					</div>
				)}
				
				{/* Education section - only show if there's education data */}
				{userData.education && userData.education.length > 0 && (
					<div className="mb-6">
						<h2 className="text-lg font-semibold text-gray-800 mb-3">Education</h2>
						{userData.education.map((edu, index) => (
							<div key={index} className={`flex items-start gap-3 ${index > 0 ? 'mt-4' : ''}`}>
								<div className="w-10 h-10 mt-1">
									<img src={edu.logo || "/logo.svg"} alt={edu.school} className="w-full h-full object-contain bg-gray-100 rounded-full p-1" />
								</div>
								<div>
									<h3 className="text-sm font-semibold">{edu.school}</h3>
									<p className="text-xs text-gray-600">{edu.fieldOfStudy}</p>
									<p className="text-xs text-gray-500 mt-1">{edu.startYear} - {edu.endYear || 'Present'} · {(edu.endYear || new Date().getFullYear()) - edu.startYear} yrs</p>
								</div>
							</div>
						))}
						
						{userData.education.length > 2 && (
							<div className="text-center mt-3">
								<button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center mx-auto">
									Show all {userData.education.length} education <span className="ml-1">↓</span>
								</button>
							</div>
						)}
					</div>
				)}
				
				{/* Skills section - only show if there are skills */}
				{userData.skills && userData.skills.length > 0 && (
					<div className="mb-6">
						<h2 className="text-lg font-semibold text-gray-800 mb-3">Skills</h2>
						{userData.skills.slice(0, 2).map((skill, index) => (
							<div key={index} className={index > 0 ? "mt-4" : ""}>
								<h3 className="text-sm font-semibold mb-2">{skill}</h3>
							</div>
						))}
						
						{userData.skills.length > 2 && (
							<div className="text-center mt-3">
								<button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center mx-auto">
									Show all {userData.skills.length} skills <span className="ml-1">↓</span>
								</button>
							</div>
						)}
					</div>
				)}
				
				{/* Activity section - showing user's posts and projects */}
				<div className="mb-6">
					<div className="flex justify-between items-center mb-3">
						<h2 className="text-lg font-semibold text-gray-800">Activity</h2>
						{userData._id && (
							<Link 
								to={`/profile/${userData.username}/activity`}
								className="text-blue-600 hover:text-blue-800 text-sm font-medium"
							>
								See all
							</Link>
						)}
					</div>

					{/* Activity tabs */}
					<div className="flex border-b mb-4">
						<button
							className={`px-4 py-2 text-sm font-medium ${
								activeActivityTab === "posts"
									? "text-primary border-b-2 border-primary"
									: "text-gray-600"
							}`}
							onClick={() => setActiveActivityTab("posts")}
						>
							Posts
						</button>
						<button
							className={`px-4 py-2 text-sm font-medium ${
								activeActivityTab === "projects"
									? "text-primary border-b-2 border-primary"
									: "text-gray-600"
							}`}
							onClick={() => setActiveActivityTab("projects")}
						>
							Projects
						</button>
					</div>

					{activeActivityTab === "posts" && (
						<div className="space-y-4">
							{userData._id ? (
								<PostsList userId={userData._id} limit={3} />
							) : (
								<div className="bg-gray-50 p-6 rounded-md text-center">
									<p className="text-gray-500">No posts to show yet.</p>
								</div>
							)}
						</div>
					)}

					{activeActivityTab === "projects" && (
						<div className="space-y-4">
							{isLoadingProjects ? (
								<div className="flex justify-center items-center py-8">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
								</div>
							) : userProjects?.projects && userProjects.projects.length > 0 ? (
								<div className="grid gap-4">
									{userProjects.projects.slice(0, 3).map((project) => (
										<Link 
											to={`/projects/${project._id}`} 
											key={project._id}
											className="block p-4 border rounded-lg hover:border-primary transition-colors"
										>
											<div className="flex items-start gap-3">
												<div className="flex-shrink-0 bg-gray-100 rounded-md p-2">
													{project.poster ? (
														<img 
															src={project.poster} 
															alt={project.name} 
															className="w-12 h-12 object-cover rounded" 
														/>
													) : (
														<Layout className="w-12 h-12 text-gray-400" />
													)}
												</div>
												<div className="flex-1 min-w-0">
													<h3 className="text-md font-medium text-gray-900 truncate">{project.name}</h3>
													<p className="text-sm text-gray-500 mb-1">{project.category}</p>
													<div className="flex items-center text-xs text-gray-500">
														<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 mr-2">
															{project.stage === "idea" ? "Idea Stage" : 
																project.stage === "buildingMVP" ? "Building MVP" :
																project.stage === "MVP" ? "MVP Completed" :
																project.stage === "prototype" ? "Prototype" :
																project.stage === "fundraising" ? "Fundraising" :
																project.stage === "growth" ? "Growth" :
																project.stage === "exit" ? "Exit" : project.stage}
														</span>
														<span className="inline-flex items-center">
															<Layers size={14} className="mr-1" />
															{project.teamMembers?.length || 1} team members
														</span>
													</div>
													<div className="mt-2 text-xs">
														<span className={`inline-flex items-center px-2 py-0.5 rounded-full ${
															project.founder._id === userData._id 
																? "bg-purple-50 text-purple-800" 
																: "bg-green-50 text-green-800"
														}`}>
															{project.founder._id === userData._id 
																? "Founder" 
																: `Team Member: ${
																		project.teamMembers && project.teamMembers.find(
																			member => member.userId && member.userId._id === userData._id
																		)?.role || "Contributor"
																	}`
															}
														</span>
													</div>
												</div>
											</div>
										</Link>
									))}
									
									{userProjects.projects.length > 3 && (
										<div className="text-center">
											<Link 
												to={`/profile/${userData.username}/projects`}
												className="text-sm text-primary font-medium hover:underline"
											>
												See all {userProjects.projects.length} projects
											</Link>
										</div>
									)}
								</div>
							) : (
								<div className="bg-gray-50 p-6 rounded-md text-center">
									<p className="text-gray-500">No projects to show yet.</p>
									{isOwnProfile && (
										<Link 
											to="/projects/create" 
											className="mt-2 inline-block text-primary font-medium hover:underline"
										>
											Create a new project
										</Link>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Contact Info Modal */}
			{showContactInfo && (
				<div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
					<div className="bg-white rounded-lg w-[90%] max-w-md overflow-hidden">
						<div className="border-b border-gray-200">
							<div className="flex justify-between items-center p-4">
								<h2 className="text-xl font-semibold">Contact Info</h2>
								<button 
									onClick={() => setShowContactInfo(false)}
									className="text-gray-500 hover:text-gray-700"
								>
									<X size={24} />
								</button>
							</div>
						</div>
						
						<div className="p-4">
							<h3 className="text-lg font-medium mb-4">{userData.name}</h3>
							
							{/* LinkedIn Profile */}
							<div className="flex items-start mb-4 pb-4 border-b border-gray-200">
								<div className="bg-blue-50 p-2 rounded-full mr-3">
									<Linkedin size={20} className="text-blue-600" />
								</div>
								<div>
									<h4 className="text-sm font-medium mb-1">{userData.name}'s Profile</h4>
									{userData.linkedin ? (
										<a 
											href={userData.linkedin} 
											target="_blank" 
											rel="noopener noreferrer"
											className="text-blue-600 text-sm hover:underline"
										>
											{userData.linkedin}
										</a>
									) : (
										<p className="text-gray-400 text-sm italic">No LinkedIn profile provided</p>
									)}
								</div>
							</div>
							
							{/* Phone */}
							<div className="flex items-start mb-4 pb-4 border-b border-gray-200">
								<div className="bg-blue-50 p-2 rounded-full mr-3">
									<Phone size={20} className="text-blue-600" />
								</div>
								<div>
									<h4 className="text-sm font-medium mb-1">Phone</h4>
									{userData.phone ? (
										<a 
											href={`tel:${userData.phone}`} 
											className="text-blue-600 text-sm hover:underline"
										>
											{userData.phone}
										</a>
									) : (
										<p className="text-gray-400 text-sm italic">No phone number provided</p>
									)}
								</div>
							</div>
							
							{/* Email */}
							{userData.email && (
								<div className="flex items-start mb-4 pb-4 border-b border-gray-200">
									<div className="bg-blue-50 p-2 rounded-full mr-3">
										<Mail size={20} className="text-blue-600" />
									</div>
									<div>
										<h4 className="text-sm font-medium mb-1">Email</h4>
										<a 
											href={`mailto:${userData.email}`} 
											className="text-blue-600 text-sm hover:underline"
										>
											{userData.email}
										</a>
									</div>
								</div>
							)}
							
							{/* Connected Since - Only shown if connected */}
							{isConnected && (
								<div className="flex items-start">
									<div className="bg-blue-50 p-2 rounded-full mr-3">
										<UserCheck size={20} className="text-blue-600" />
									</div>
									<div>
										<h4 className="text-sm font-medium mb-1">Connected</h4>
										<p className="text-gray-600 text-sm">
											{connectionStatus?.data?.connectionDate ? 
												new Date(connectionStatus.data.connectionDate).toLocaleDateString('en-US', {
													year: 'numeric',
													month: 'long',
													day: 'numeric'
												}) : 
												"Recently connected"}
										</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
			
			{/* Cropper Modal */}
			{showCropper && (
				<div className='fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center'>
					<div className='bg-white p-6 rounded-lg w-[90%] max-w-2xl'>
						<h3 className="text-xl font-bold mb-4">Crop Profile Picture</h3>
						<div className='h-[400px] relative'>
							<Cropper
								image={imageSrc}
								crop={crop}
								zoom={zoom}
								aspect={1}
								onCropChange={setCrop}
								onZoomChange={setZoom}
								onCropComplete={onCropComplete}
							/>
						</div>
						<div className="mt-4">
							<label className="block text-sm font-medium text-gray-700 mb-1">Zoom</label>
							<input
								type="range"
								value={zoom}
								min={1}
								max={3}
								step={0.1}
								onChange={(e) => setZoom(Number(e.target.value))}
								className="w-full"
							/>
						</div>
						<div className='mt-4 flex justify-end space-x-3'>
							<button
								onClick={() => setShowCropper(false)}
								className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
							>
								Cancel
							</button>
							<button
								onClick={handleCropComplete}
								className='px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark'
							>
								Apply
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProfileHeader;
