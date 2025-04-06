import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import ProfileHeader from "../components/ProfileHeader";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

const ProfilePage = () => {
	const { username } = useParams();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [password, setPassword] = useState("");
	const [deleteError, setDeleteError] = useState("");

	const { data: authUser, isLoading } = useQuery({
		queryKey: ["authUser"],
		queryFn: () => axiosInstance.get('/auth/me').then(res => res.data),
	});

	const { data: userProfile, isLoading: isUserProfileLoading } = useQuery({
		queryKey: ["userProfile", username],
		queryFn: () => axiosInstance.get(`/users/${username}`),
		onSuccess: (data) => {
			// Add example data for testing the UI (will be removed in production)
			if (data && !data.data.isVerified && username === "Tushar_uday") {
				data.data.isVerified = true;
				data.data.club = "Entrepreneur's Club CMRCET";
				data.data.organization = "Aspiring Computer Science Engineer | Tech & Finance Enthusiast";
			}
		}
	});

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
			
			// Copy other data
			Object.keys(updatedData).forEach(key => {
				if (!['profilePicture', 'bannerImg', 'experience', 'education', 'orgLogo', '_suppressToast'].includes(key)) {
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

	const isOwnProfile = authUser.username === userProfile.data.username;
	const userData = userProfile.data;

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
			
			{isOwnProfile && (
				<div className="p-4 md:p-6">
					<div className="bg-white shadow-md rounded-xl p-6">
						<h2 className="text-xl font-semibold mb-4">Account Actions</h2>
						<button
							onClick={handleDelete}
							className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200 font-medium"
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
