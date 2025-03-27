import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import ProfileHeader from "../components/ProfileHeader";
import AboutSection from "../components/AboutSection";
import ExperienceSection from "../components/ExperienceSection";
import EducationSection from "../components/EducationSection";
import SkillsSection from "../components/SkillsSection";
import toast from "react-hot-toast";

const ProfilePage = () => {
	const { username } = useParams();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [password, setPassword] = useState("");
	const [deleteError, setDeleteError] = useState("");

	const { data: authUser, isLoading } = useQuery({
		queryKey: ["authUser"],
	});

	const { data: userProfile, isLoading: isUserProfileLoading } = useQuery({
		queryKey: ["userProfile", username],
		queryFn: () => axiosInstance.get(`/users/${username}`),
	});

	const { mutate: updateProfile } = useMutation({
		mutationFn: async (updatedData) => {
			await axiosInstance.put("/users/profile", updatedData);
		},
		onSuccess: () => {
			toast.success("Profile updated successfully");
			queryClient.invalidateQueries(["userProfile", username]);
		},
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

	if (isLoading || isUserProfileLoading) return null;

	const isOwnProfile = authUser.username === userProfile.data.username;
	const userData = isOwnProfile ? authUser : userProfile.data;

	const handleSave = (updatedData) => {
		updateProfile(updatedData);
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
		<div className='max-w-4xl mx-auto p-4'>
			<ProfileHeader userData={userData} isOwnProfile={isOwnProfile} onSave={handleSave} />
			<AboutSection userData={userData} isOwnProfile={isOwnProfile} onSave={handleSave} />
			<ExperienceSection userData={userData} isOwnProfile={isOwnProfile} onSave={handleSave} />
			<EducationSection userData={userData} isOwnProfile={isOwnProfile} onSave={handleSave} />
			<SkillsSection userData={userData} isOwnProfile={isOwnProfile} onSave={handleSave} />
			{isOwnProfile && (
				<div className="mt-8 border-t pt-6">
					<button
						onClick={handleDelete}
						className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
					>
						Delete Account
					</button>
				</div>
			)}
			{showDeleteModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white p-6 rounded-lg max-w-md w-full">
						<h2 className="text-xl font-bold mb-4">Delete Profile</h2>
						<p className="text-gray-600 mb-4">
							This action cannot be undone. Please enter your password to confirm deletion.
						</p>
						<input
							type="password"
							placeholder="Enter your password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full p-2 border rounded mb-4"
						/>
						{deleteError && (
							<p className="text-red-500 text-sm mb-4">{deleteError}</p>
						)}
						<div className="flex justify-end gap-4">
							<button
								onClick={() => setShowDeleteModal(false)}
								className="px-4 py-2 text-gray-600 hover:text-gray-800"
							>
								Cancel
							</button>
							<button
								onClick={handleConfirmDelete}
								className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
							>
								Delete Profile
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
export default ProfilePage;
