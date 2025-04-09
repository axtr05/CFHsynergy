import { useParams, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import ProfileHeader from "../components/ProfileHeader";
import toast from "react-hot-toast";
import { Loader2, DollarSign } from "lucide-react";

const ProfilePage = () => {
	const { username } = useParams();
	const location = useLocation();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showProfilePrompt, setShowProfilePrompt] = useState(false);
	const [password, setPassword] = useState("");
	const [deleteError, setDeleteError] = useState("");
	const [investmentRange, setInvestmentRange] = useState({ min: 10000, max: 100000 });
	const [minInputValue, setMinInputValue] = useState('');
	const [maxInputValue, setMaxInputValue] = useState('');
	const [isMinFocused, setIsMinFocused] = useState(false);
	const [isMaxFocused, setIsMaxFocused] = useState(false);
	
	// Check if user just came from role selection
	const isNewUser = location.state?.newUser;
	const userRole = location.state?.userRole;

	const { data: authUser, isLoading } = useQuery({
		queryKey: ["authUser"],
		queryFn: () => axiosInstance.get('/auth/me').then(res => res.data),
	});

	const { data: userProfile, isLoading: isUserProfileLoading } = useQuery({
		queryKey: ["userProfile", username],
		queryFn: () => axiosInstance.get(`/users/${username}`),
		onSuccess: (data) => {
			// If user is an investor, set initial investment range
			if (data?.data?.userRole === "investor" && data?.data?.investmentRange) {
				setInvestmentRange(data.data.investmentRange);
			}
			
			// Show profile completion prompt for new users
			if (isNewUser && authUser?.username === username) {
				setShowProfilePrompt(true);
			}
		}
	});

	// Update investment range when user profile changes
	useEffect(() => {
		if (userProfile?.data?.investmentRange) {
			setInvestmentRange(userProfile.data.investmentRange);
			setMinInputValue(userProfile.data.investmentRange.min.toString());
			setMaxInputValue(userProfile.data.investmentRange.max.toString());
		}
	}, [userProfile?.data?.investmentRange]);

	// Watch for changes in user role to update UI accordingly
	useEffect(() => {
		const currentRole = userProfile?.data?.userRole;
		
		// If user just changed to investor, make sure investment range section shows
		if (currentRole === 'investor' && !investmentRange) {
			setInvestmentRange({ min: 10000, max: 100000 });
		}
	}, [userProfile?.data?.userRole]);

	const { mutate: updateProfile } = useMutation({
		mutationFn: async (updatedData) => {
			// Create a regular object for the data
			const dataToSend = {};
			
			// Handle profile picture
			if (updatedData.profilePicture) {
				try {
					// For Cloudinary, we need to send the raw data URL
					dataToSend.profilePicture = updatedData.profilePicture;
				} catch (error) {
					console.error("Error processing profile picture:", error);
					toast.error("Error processing profile picture");
					return;
				}
			}
			
			// Handle banner image
			if (updatedData.bannerImg) {
				try {
					// For Cloudinary, we need to send the raw data URL
					dataToSend.bannerImg = updatedData.bannerImg;
				} catch (error) {
					console.error("Error processing banner image:", error);
					toast.error("Error processing banner image");
					return;
				}
			}
			
			// Handle organization logo
			if (updatedData.orgLogo) {
				try {
					// For Cloudinary, we need to send the raw data URL
					dataToSend.orgLogo = updatedData.orgLogo;
				} catch (error) {
					console.error("Error processing organization logo:", error);
					toast.error("Error processing organization logo");
					return;
				}
			}
			
			// Handle experience array and logos
			if (updatedData.experience) {
				dataToSend.experience = updatedData.experience;
			}
			
			// Handle education array and logos
			if (updatedData.education) {
				dataToSend.education = updatedData.education;
			}
			
			// Handle investment range for investors
			if (updatedData.investmentRange) {
				dataToSend.investmentRange = updatedData.investmentRange;
			}
			
			// Copy other data
			Object.keys(updatedData).forEach(key => {
				if (!['profilePicture', 'bannerImg', 'experience', 'education', 'orgLogo', 'investmentRange', '_suppressToast'].includes(key)) {
					dataToSend[key] = updatedData[key];
				}
			});

			await axiosInstance.put("/users/profile", dataToSend);
			
			// Store flag for success/error handlers
			return { _suppressToast: updatedData._suppressToast };
		},
		onSuccess: (data) => {
			if (!data?._suppressToast) {
			toast.success("Profile updated successfully");
			}
			
			// Close profile prompt if it was open
			setShowProfilePrompt(false);
			
			// Clear new user state after successful update
			if (isNewUser) {
				navigate(`/profile/${username}`, { replace: true });
			}
			
			queryClient.invalidateQueries(["userProfile", username]);
		},
		onError: (error, variables) => {
			console.error("Profile update error:", error);
			if (!variables._suppressToast) {
				toast.error(error.response?.data?.message || 'Failed to update profile');
			}
		}
	});

	const { mutate: deleteProfile } = useMutation({
		mutationFn: async (password) => {
			await axiosInstance.delete(`/users/${username}`, {
				data: { password }
			});
		},
		onSuccess: () => {
			toast.success("Profile deleted successfully");
			queryClient.setQueryData(["authUser"], null);
			navigate("/login");
		},
		onError: (error) => {
			setDeleteError(error.response?.data?.message || "Failed to delete profile");
		}
	});

	if (isLoading || isUserProfileLoading) {
		return (
			<div className="flex justify-center items-center min-h-screen bg-gray-50">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="h-10 w-10 animate-spin text-primary" />
					<p className="text-gray-600 font-medium">Loading profile...</p>
				</div>
			</div>
		);
	}

	// Make sure we have both user data objects before trying to use them
	if (!userProfile?.data || !authUser) {
		return (
			<div className="flex justify-center items-center min-h-screen bg-gray-50">
				<div className="flex flex-col items-center gap-3">
					<p className="text-gray-600 font-medium">User profile not found</p>
				</div>
			</div>
		);
	}

	const isOwnProfile = authUser?.username === userProfile?.data?.username;
	const userData = userProfile?.data;
	const isInvestor = userData?.userRole === "investor";

	const handleProfileUpdate = async (updatedData, isHeaderToast = false) => {
		try {
			// If the header component is showing its own toast, don't show duplicates here
			updateProfile({
				...updatedData,
				_suppressToast: isHeaderToast
			});
				} catch (error) {
			console.error("Profile update error:", error);
			if (!isHeaderToast) {
				toast.error(error.response?.data?.message || 'Failed to update profile');
			}
		}
	};

	const handleInvestmentRangeUpdate = async () => {
		if (investmentRange.min > investmentRange.max) {
			toast.error('Minimum investment cannot be greater than maximum investment');
					return;
		}
		
		const profileData = {
			investmentRange
		};
		
		try {
			await updateProfile(profileData);
			toast.success('Investment range updated successfully');
			
			// Refresh user data to reflect changes
			queryClient.invalidateQueries(['user', userProfile.data._id]);
		} catch (error) {
			toast.error('Failed to update investment range');
			console.error(error);
		}
	};

	const handleDelete = () => {
		setShowDeleteModal(true);
	};

	const handleConfirmDelete = () => {
		if (!password) {
			setDeleteError("Password is required");
			return;
		}
		deleteProfile(password);
	};

	return (
		<div className='max-w-5xl mx-auto bg-gray-50 min-h-screen'>
			<ProfileHeader userData={userData} isOwnProfile={isOwnProfile} onSave={handleProfileUpdate} />
			
			{/* Profile completion prompt for new users */}
			{showProfilePrompt && isOwnProfile && (
				<div className="p-4 md:p-6">
					<div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
						<h2 className="text-xl font-semibold mb-2 text-blue-800">Complete Your Profile</h2>
						<p className="mb-4 text-blue-700">
							Welcome! Please take a moment to complete your profile information.
							This will help others understand more about you.
						</p>
						<button
							onClick={() => setShowProfilePrompt(false)}
							className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 font-medium"
						>
							Got it
						</button>
					</div>
				</div>
			)}
			
			{/* Investment Range Section for Investors */}
			{isInvestor && isOwnProfile && (
				<div className="bg-white shadow-sm rounded-lg p-6 mt-6">
					<div className="flex items-center mb-4">
						<DollarSign className="text-green-600 mr-2" size={22} />
						<h2 className="text-xl font-semibold text-gray-800">Investment Preferences</h2>
					</div>
					<p className="text-gray-600 mb-4">
						Set your investment range to help entrepreneurs understand your funding capabilities.
						This information will be visible on your public profile.
					</p>
					
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Minimum Investment Amount (USD)
							</label>
							<input
								type="text"
								value={isMinFocused ? minInputValue : investmentRange.min.toLocaleString()}
								onChange={(e) => {
									const value = e.target.value.replace(/[^0-9]/g, '');
									setMinInputValue(value);
									
									if (value !== '') {
										setInvestmentRange(prev => ({
											...prev,
											min: parseInt(value)
										}));
									}
								}}
								onFocus={() => {
									setIsMinFocused(true);
									setMinInputValue(investmentRange.min.toString());
								}}
								onBlur={() => {
									setIsMinFocused(false);
									// If field is empty when losing focus, set to 0
									if (minInputValue === '') {
										setInvestmentRange(prev => ({
											...prev,
											min: 0
										}));
										setMinInputValue('0');
									}
								}}
								className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Maximum Investment Amount (USD)
							</label>
							<input
								type="text"
								value={isMaxFocused ? maxInputValue : investmentRange.max.toLocaleString()}
								onChange={(e) => {
									const value = e.target.value.replace(/[^0-9]/g, '');
									setMaxInputValue(value);
									
									if (value !== '') {
										setInvestmentRange(prev => ({
											...prev,
											max: parseInt(value)
										}));
									}
								}}
								onFocus={() => {
									setIsMaxFocused(true);
									setMaxInputValue(investmentRange.max.toString());
								}}
								onBlur={() => {
									setIsMaxFocused(false);
									// If field is empty when losing focus, set to 0
									if (maxInputValue === '') {
										setInvestmentRange(prev => ({
											...prev,
											max: 0
										}));
										setMaxInputValue('0');
									}
								}}
								className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						
						<button
							onClick={handleInvestmentRangeUpdate}
							className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md font-semibold transition-colors"
						>
							Update Investment Range
						</button>
					</div>
				</div>
			)}
			
					{isOwnProfile && (
				<div className="p-4 md:p-6">
					<div className="bg-white shadow-md rounded-xl p-6">
						<h2 className="text-xl font-semibold mb-4">Account Actions</h2>
							<button
								onClick={handleDelete}
							className="px-5 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 font-medium"
							>
								Delete Account
							</button>
						</div>
				</div>
			)}

			{showDeleteModal && (
				<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
					<div className="bg-white p-6 rounded-xl max-w-md w-full shadow-xl">
						<h2 className="text-xl font-bold mb-4">Delete Your Profile</h2>
						<p className="text-gray-600 mb-5">
							This action cannot be undone. All your data will be permanently removed.
						</p>
						<div className="space-y-4">
							<div>
								<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
									Enter your password to confirm
								</label>
						<input
									id="password"
							type="password"
									placeholder="Your password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
									className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
									onKeyPress={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											handleConfirmDelete();
										}
									}}
						/>
						{deleteError && (
									<p className="text-red-500 text-sm mt-1">{deleteError}</p>
						)}
							</div>
							
							<div className="flex justify-end gap-3 mt-6">
							<button
								onClick={() => setShowDeleteModal(false)}
									className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
							>
								Cancel
							</button>
							<button
								onClick={handleConfirmDelete}
									className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
							>
								Delete Profile
							</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProfilePage;