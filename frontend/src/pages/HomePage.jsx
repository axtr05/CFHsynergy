import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import Sidebar from "../components/Sidebar";
import PostCreation from "../components/PostCreation";
import Post from "../components/Post";
import { Users, Loader2, Briefcase, TrendingUp, Sparkles } from "lucide-react";
import RecommendedUser from "../components/RecommendedUser";
import { useAuthUser } from "../utils/authHooks";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
	const navigate = useNavigate();
	const { data: authUser, isLoading: isAuthLoading } = useAuthUser();

	// Get recommendations based on user role
	const { data: recommendedUsers, isLoading: isRecommendationsLoading } = useQuery({
		queryKey: ["recommendedUsers", authUser?.userRole, "preview"],
		queryFn: async () => {
			// Different endpoint based on user role
			const roleParam = authUser?.userRole || "default";
			const res = await axiosInstance.get(`/users/suggestions?role=${roleParam}&limit=20`);
			return res.data;
		},
		enabled: !!authUser
	});

	const { data: posts, isLoading: isPostsLoading } = useQuery({
		queryKey: ["posts"],
		queryFn: async () => {
			const res = await axiosInstance.get("/posts");
			// Log post data to verify content
			console.log("Posts from API:", res.data);
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
	
	// Sort users by role priority: founders and investors first, then job seekers
	const sortRecommendedUsers = (users) => {
		if (!users) return [];
		
		// Separate users by role
		const founders = users.filter(user => user.userRole === "founder");
		const investors = users.filter(user => user.userRole === "investor");
		const jobSeekers = users.filter(user => user.userRole === "job_seeker");
		const others = users.filter(user => 
			user.userRole !== "founder" && 
			user.userRole !== "investor" && 
			user.userRole !== "job_seeker"
		);
		
		// Combine in priority order
		return [...founders, ...investors, ...jobSeekers, ...others].slice(0, 5);
	};
	
	const sortedRecommendedUsers = sortRecommendedUsers(recommendedUsers);

	// Determine the title and icon based on user role
	const getRecommendationTitle = () => {
		switch(authUser?.userRole) {
			case "founder":
				return {
					title: "Investors you may want to connect with",
					subtitle: "Connect with investors who can help grow your startup",
					icon: <TrendingUp size={20} className="text-blue-500" />,
					gradient: "from-blue-500 to-indigo-500"
				};
			case "investor":
				return {
					title: "Founders you may want to connect with",
					subtitle: "Discover promising startups and founders",
					icon: <Briefcase size={20} className="text-green-500" />,
					gradient: "from-green-500 to-emerald-500"
				};
			case "job_seeker":
				return {
					title: "Founders looking for talent",
					subtitle: "Find opportunities at growing startups",
					icon: <Briefcase size={20} className="text-purple-500" />,
					gradient: "from-purple-500 to-pink-500"
				};
			default:
				return {
					title: "People you may know",
					subtitle: "Expand your professional network",
					icon: <Users size={20} className="text-gray-500" />,
					gradient: "from-gray-500 to-slate-500"
				};
		}
	};

	const recommendation = getRecommendationTitle();

	return (
		<div className="max-w-7xl mx-auto pt-6">
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
							{posts?.map((post) => {
								console.log("Rendering post:", post._id, "with content:", post.content);
								return (
									<Post key={post._id} post={post} />
								);
							})}

							{posts?.length === 0 && (
								<div className='bg-white dark:bg-secondary rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center'>
									<div className='mb-6'>
										<Users size={64} className='mx-auto text-blue-500 dark:text-blue-400' />
									</div>
									<h2 className='text-2xl font-bold mb-4 text-gray-800 dark:text-white'>No Posts Yet</h2>
									<p className='text-gray-600 dark:text-gray-300 mb-6'>No posts yet! Be the first to share something with the community.</p>
									<button 
										onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
										className='px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors'
									>
										Create Your First Post
									</button>
								</div>
							)}
						</>
					)}
				</div>

				{sortedRecommendedUsers?.length > 0 && (
					<div className='col-span-1 lg:col-span-1 hidden lg:block'>
						<div className='bg-white dark:bg-secondary rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
							{/* Header with gradient background */}
							<div className={`bg-gradient-to-r ${recommendation.gradient} p-4 text-white`}>
								<div className="flex items-center gap-3 mb-2">
									<div className="bg-white/20 p-2 rounded-lg">
										{recommendation.icon}
									</div>
									<h2 className='font-semibold text-lg'>{recommendation.title}</h2>
								</div>
								<p className="text-sm text-white/80">{recommendation.subtitle}</p>
							</div>

							{/* Recommendations list */}
							<div className="p-4">
								{isRecommendationsLoading ? (
									<div className="flex justify-center py-4">
										<Loader2 className="h-6 w-6 animate-spin text-primary" />
									</div>
								) : (
									<div className="space-y-4">
										{sortedRecommendedUsers.map((user, index) => (
											<div key={user._id} className="transform transition-all duration-200 hover:scale-[1.02]">
												<RecommendedUser user={user} />
												{index < sortedRecommendedUsers.length - 1 && (
													<div className="h-px bg-gray-100 dark:bg-gray-700 my-4" />
												)}
											</div>
										))}
									</div>
								)}
							</div>

							{/* Footer with view all link */}
							<div className="border-t border-gray-100 dark:border-gray-700 p-4">
								<button 
									onClick={() => navigate('/recommendations')}
									className="w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
								>
									<Sparkles size={16} />
									View all recommendations
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
export default HomePage;
