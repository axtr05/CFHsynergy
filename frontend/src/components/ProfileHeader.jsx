import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import { axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';

import { Camera, Clock, MapPin, UserCheck, UserPlus, X } from "lucide-react";

const ProfileHeader = ({ userData, onSave, isOwnProfile }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editedData, setEditedData] = useState({});
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
	const [imageSrc, setImageSrc] = useState(null);
	const [showCropper, setShowCropper] = useState(false);
	const queryClient = useQueryClient();

	const { data: authUser } = useQuery({ queryKey: ["authUser"] });

	const { data: connectionStatus, refetch: refetchConnectionStatus } = useQuery({
		queryKey: ["connectionStatus", userData._id],
		queryFn: () => axiosInstance.get(`/connections/status/${userData._id}`),
		enabled: !isOwnProfile,
	});

	const isConnected = userData.connections.some((connection) => connection === authUser._id);

	const { mutate: sendConnectionRequest } = useMutation({
		mutationFn: (userId) => axiosInstance.post(`/connections/request/${userId}`),
		onSuccess: () => {
			toast.success("Connection request sent");
			refetchConnectionStatus();
			queryClient.invalidateQueries(["connectionRequests"]);
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "An error occurred");
		},
	});

	const { mutate: acceptRequest } = useMutation({
		mutationFn: (requestId) => axiosInstance.put(`/connections/accept/${requestId}`),
		onSuccess: () => {
			toast.success("Connection request accepted");
			refetchConnectionStatus();
			queryClient.invalidateQueries(["connectionRequests"]);
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
			refetchConnectionStatus();
			queryClient.invalidateQueries(["connectionRequests"]);
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "An error occurred");
		},
	});

	const getConnectionStatus = useMemo(() => {
		if (isConnected) return "connected";
		if (!isConnected) return "not_connected";
		return connectionStatus?.data?.status;
	}, [isConnected, connectionStatus]);

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
		onSave(editedData);
		setIsEditing(false);
	};

	const renderConnectionButton = () => {
		const baseClass = "text-white py-2 px-4 rounded-full transition duration-300 flex items-center justify-center";
		switch (getConnectionStatus) {
			case "connected":
				return (
					<div className='flex gap-2 justify-center'>
						<div className={`${baseClass} bg-green-500 hover:bg-green-600`}>
							<UserCheck size={20} className='mr-2' />
							Connected
						</div>
						<button
							className={`${baseClass} bg-red-500 hover:bg-red-600 text-sm`}
							onClick={() => removeConnection(userData._id)}
						>
							<X size={20} className='mr-2' />
							Remove Connection
						</button>
					</div>
				);

			case "pending":
				return (
					<button className={`${baseClass} bg-yellow-500 hover:bg-yellow-600`}>
						<Clock size={20} className='mr-2' />
						Pending
					</button>
				);

			case "received":
				return (
					<div className='flex gap-2 justify-center'>
						<button
							onClick={() => acceptRequest(connectionStatus.data.requestId)}
							className={`${baseClass} bg-green-500 hover:bg-green-600`}
						>
							Accept
						</button>
						<button
							onClick={() => rejectRequest(connectionStatus.data.requestId)}
							className={`${baseClass} bg-red-500 hover:bg-red-600`}
						>
							Reject
						</button>
					</div>
				);
			default:
				return (
					<button
						onClick={() => sendConnectionRequest(userData._id)}
						className='bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded-full transition duration-300 flex items-center justify-center'
					>
						<UserPlus size={20} className='mr-2' />
						Connect
					</button>
				);
		}
	};

	return (
		<div className='bg-white shadow rounded-lg mb-6'>
			<div
				className='relative h-60 rounded-t-lg bg-cover bg-center bg-[#a0b4b7]'
				style={{
					backgroundImage: `url('${editedData.bannerImg || userData.bannerImg || "/banner.png"}')`,
				}}
			>
				{isEditing && (
					<label className='absolute bottom-4 right-4 bg-white p-2 rounded-full shadow cursor-pointer hover:bg-gray-50'>
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
			</div>

			<div className='px-6 relative'>
				<div className='relative -mt-24 mb-4'>
					<div className='inline-block relative'>
						<img
							className='w-40 h-40 rounded-full border-4 border-white bg-white object-cover'
							src={editedData.profilePicture || userData.profilePicture || "/avatar.png"}
							alt={userData.name}
						/>
						{isEditing && (
							<label className='absolute bottom-2 right-2 bg-white p-2 rounded-full shadow cursor-pointer hover:bg-gray-50'>
								<Camera size={20} />
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

				<div className='flex justify-between items-start mb-4'>
					<div className='flex-1'>
						{isEditing ? (
							<input
								type='text'
								value={editedData.name ?? userData.name}
								onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
								className='text-2xl font-bold mb-1 w-full'
							/>
						) : (
							<h1 className='text-2xl font-bold mb-1'>{userData.name}</h1>
						)}

						{isEditing ? (
							<input
								type='text'
								value={editedData.headline ?? userData.headline}
								onChange={(e) => setEditedData({ ...editedData, headline: e.target.value })}
								className='text-gray-600 mb-2 w-full'
							/>
						) : (
							<p className='text-gray-600 mb-2'>{userData.headline}</p>
						)}

						<div className='flex items-center text-gray-600 mb-2'>
							<MapPin size={16} className='mr-1' />
							{isEditing ? (
								<input
									type='text'
									value={editedData.location ?? userData.location}
									onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
									className='text-gray-600'
								/>
							) : (
								<span>{userData.location}</span>
							)}
						</div>

						<div className='text-gray-600 text-sm'>
							{userData.connections?.length || 0} connections
						</div>
					</div>

					{isOwnProfile && (
						<div className='mt-4'>
							{isEditing ? (
								<button
									onClick={handleSave}
									className='bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dark transition duration-300'
								>
									Save
								</button>
							) : (
								<button
									onClick={() => setIsEditing(true)}
									className='border border-primary text-primary px-6 py-2 rounded-full hover:bg-primary hover:text-white transition duration-300'
								>
									Edit profile
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			{showCropper && (
				<div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center'>
					<div className='bg-white p-4 rounded-lg w-[90%] max-w-2xl'>
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
						<div className='mt-4 flex justify-end space-x-2'>
							<button
								onClick={() => setShowCropper(false)}
								className='px-4 py-2 text-gray-600 hover:text-gray-800'
							>
								Cancel
							</button>
							<button
								onClick={handleCropComplete}
								className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
							>
								Crop & Save
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProfileHeader;
