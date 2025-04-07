import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import Sidebar from "../components/Sidebar";
import PostCreation from "../components/PostCreation";
import Post from "../components/Post";
import { Users, Loader2 } from "lucide-react";
import RecommendedUser from "../components/RecommendedUser";
import { useAuthUser } from "../utils/authHooks";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
	const navigate = useNavigate();
	const { data: authUser, isLoading: isAuthLoading } = useAuthUser();

	const { data: recommendedUsers } = useQuery({
		queryKey: ["recommendedUsers"],
		queryFn: async () => {
			const res = await axiosInstance.get("/users/suggestions");
			return res.data;
		},
		enabled: !!authUser
	});

	const { data: posts, isLoading: isPostsLoading } = useQuery({
		queryKey: ["posts"],
		queryFn: async () => {
			const res = await axiosInstance.get("/posts");
			return res.data;
		},
		enabled: !!authUser
	});

	if (isAuthLoading) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="h-10 w-10 animate-spin text-primary" />
					<p className="text-gray-600 font-medium">Loading...</p>
				</div>
			</div>
		);
	}

	const isLoading = isPostsLoading;

	return (
		<div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
			<div className='hidden lg:block lg:col-span-1'>
				<Sidebar user={authUser} />
			</div>

			<div className='col-span-1 lg:col-span-2 order-first lg:order-none'>
				<PostCreation user={authUser} />

				{isLoading ? (
					<div className="flex justify-center items-center py-8">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				) : (
					<>
						{posts?.map((post) => (
							<Post key={post._id} post={post} />
						))}

						{posts?.length === 0 && (
							<div className='bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center'>
								<div className='mb-6'>
									<Users size={64} className='mx-auto text-blue-500' />
								</div>
								<h2 className='text-2xl font-bold mb-4 text-gray-800'>No Posts Yet</h2>
								<p className='text-gray-600 mb-6'>Connect with others to start seeing posts in your feed!</p>
							</div>
						)}
					</>
				)}
			</div>

			{recommendedUsers?.length > 0 && (
				<div className='col-span-1 lg:col-span-1 hidden lg:block'>
					<div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
						<h2 className='font-semibold mb-4'>People you may know</h2>
						{recommendedUsers?.map((user) => (
							<RecommendedUser key={user._id} user={user} />
						))}
					</div>
				</div>
			)}
		</div>
	);
};
export default HomePage;
