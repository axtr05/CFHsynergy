import { useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import Sidebar from "../components/Sidebar";
import { UserPlus, Menu, ArrowLeft } from "lucide-react";
import FriendRequest from "../components/FriendRequest";
import UserCard from "../components/UserCard";
import { useAuthUser } from "../utils/authHooks";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const NetworkPage = () => {
	const queryClient = useQueryClient();
	const { data: user } = useAuthUser();
	const [showMobileSidebar, setShowMobileSidebar] = useState(false);

	const { data: connectionRequests } = useQuery({
		queryKey: ["connectionRequests"],
		queryFn: () => axiosInstance.get("/connections/requests"),
		refetchOnWindowFocus: true,
		refetchOnMount: true,
		refetchInterval: 15000,
		staleTime: 5000,
	});

	const { data: connections } = useQuery({
		queryKey: ["connections"],
		queryFn: () => axiosInstance.get("/connections"),
	});

	useEffect(() => {
		queryClient.prefetchQuery({
			queryKey: ["connectionRequests"],
			queryFn: () => axiosInstance.get("/connections/requests"),
		});

		const intervalId = setInterval(() => {
			queryClient.invalidateQueries({ queryKey: ["connectionRequests"] });
		}, 30000);

		return () => clearInterval(intervalId);
	}, [queryClient]);

	// Toggle mobile sidebar
	const toggleMobileSidebar = () => {
		setShowMobileSidebar(!showMobileSidebar);
	};

	return (
		<div className='grid grid-cols-1 lg:grid-cols-4 gap-6 relative max-w-7xl mx-auto px-4 py-6'>
			{/* Mobile Sidebar Toggle */}
			<button 
				onClick={toggleMobileSidebar}
				className="lg:hidden fixed bottom-6 right-6 z-30 bg-primary text-white p-3 rounded-full shadow-lg"
				aria-label="Toggle sidebar"
			>
				<Menu size={24} />
			</button>

			{/* Sidebar - Hidden on mobile by default */}
			<div className={`
				${showMobileSidebar ? 'fixed inset-0 z-40 bg-black bg-opacity-50' : 'hidden'} 
				lg:block lg:static lg:bg-transparent lg:z-auto lg:col-span-1
			`}>
				<div className={`
					${showMobileSidebar ? 'translate-x-0 fixed right-0 top-0 h-full w-3/4 max-w-xs bg-white shadow-xl overflow-y-auto' : '-translate-x-full'} 
					lg:translate-x-0 lg:static lg:h-auto lg:w-auto lg:max-w-none lg:shadow-none
					transition-transform duration-300 ease-in-out
				`}>
					<div className={`${showMobileSidebar ? 'p-4' : ''} lg:p-0`}>
						{showMobileSidebar && (
							<div className="flex justify-between items-center mb-6 border-b pb-4">
								<h2 className="text-lg font-bold">Menu</h2>
								<button onClick={toggleMobileSidebar} className="text-gray-500">
									<ArrowLeft size={20} />
								</button>
							</div>
						)}
						<Sidebar user={user} />
					</div>
				</div>
			</div>

			<div className='col-span-1 lg:col-span-3'>
				<div className='bg-secondary rounded-lg shadow p-4 md:p-6 mb-6'>
					<h1 className='text-2xl font-bold mb-6'>My Network</h1>

					{connectionRequests?.data?.length > 0 ? (
						<div className='mb-8'>
							<h2 className='text-xl font-semibold mb-2'>Connection Request</h2>
							<div className='space-y-4'>
								{connectionRequests.data.map((request) => (
									<FriendRequest key={request.id} request={request} />
								))}
							</div>
						</div>
					) : (
						<div className='bg-white rounded-lg shadow p-4 md:p-6 text-center mb-6'>
							<UserPlus size={48} className='mx-auto text-gray-400 mb-4' />
							<h3 className='text-xl font-semibold mb-2'>No Connection Requests</h3>
							<p className='text-gray-600'>
								You don&apos;t have any pending connection requests at the moment.
							</p>
							<p className='text-gray-600 mt-2'>
								Explore suggested connections below to expand your network!
							</p>
						</div>
					)}

					{/* Link to Recommendations/Suggested People */}
					<div className='bg-primary/5 border border-primary/20 rounded-lg p-4 md:p-6 mb-8'>
						<div className='flex flex-col md:flex-row items-center justify-between gap-4'>
							<div className='flex items-center gap-4'>
								<div className='bg-primary/10 p-3 rounded-full'>
									<UserPlus size={24} className='text-primary' />
								</div>
								<div>
									<h3 className='text-lg font-semibold'>Discover Suggested People</h3>
									<p className='text-gray-600 text-sm'>
										Find and connect with people in your industry who match your interests
									</p>
								</div>
							</div>
							<Link 
								to='/recommendations' 
								className='bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap w-full md:w-auto text-center'
							>
								View Recommendations
							</Link>
						</div>
					</div>

					{connections?.data?.length > 0 && (
						<div className='mb-8'>
							<h2 className='text-xl font-semibold mb-4'>My Connections</h2>
							<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
								{connections.data.map((connection) => (
									<UserCard key={connection._id} user={connection} isConnection={true} />
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
export default NetworkPage;
