import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import { Link } from "react-router-dom";
import { Bell, Home, LogOut, User, Users, ChevronDown } from "lucide-react";
import SearchBar from "../SearchBar";
import { useState, useRef, useEffect } from "react";

const Navbar = () => {
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();
	const [showDropdown, setShowDropdown] = useState(false);
	const dropdownRef = useRef(null);

	const { data: notifications } = useQuery({
		queryKey: ["notifications"],
		queryFn: async () => axiosInstance.get("/notifications"),
		enabled: !!authUser,
	});

	const { data: connectionRequests } = useQuery({
		queryKey: ["connectionRequests"],
		queryFn: async () => axiosInstance.get("/connections/requests"),
		enabled: !!authUser,
	});

	const { mutate: logout } = useMutation({
		mutationFn: () => axiosInstance.post("/auth/logout"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
		},
	});

	const unreadNotificationCount = notifications?.data.filter((notif) => !notif.read).length;
	const unreadConnectionRequestsCount = connectionRequests?.data?.length;

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setShowDropdown(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<nav className='bg-secondary shadow-md sticky top-0 z-10'>
			<div className='max-w-7xl mx-auto px-4'>
				<div className='flex justify-between items-center py-3'>
					<div className='flex items-center space-x-4'>
						<Link to='/'>
							<img className='h-8 rounded' src='/small-logo.png' alt='LinkedIn' />
						</Link>
						{authUser && <SearchBar />}
					</div>
					<div className='flex items-center gap-2 md:gap-6'>
						{authUser ? (
							<>
								<Link to={"/"} className='text-neutral flex flex-col items-center'>
									<Home size={20} />
									<span className='text-[11px] hidden md:block'>Home</span>
								</Link>
								<Link to='/network' className='text-neutral flex flex-col items-center relative'>
									<Users size={20} />
									<span className='text-[11px] hidden md:block'>My Network</span>
									{unreadConnectionRequestsCount > 0 && (
										<span
											className='absolute -top-1 -right-1 md:right-4 bg-blue-500 text-white text-xs 
										rounded-full size-3 md:size-4 flex items-center justify-center'
										>
											{unreadConnectionRequestsCount}
										</span>
									)}
								</Link>
								<Link to='/notifications' className='text-neutral flex flex-col items-center relative'>
									<Bell size={20} />
									<span className='text-[11px] hidden md:block'>Notifications</span>
									{unreadNotificationCount > 0 && (
										<span
											className='absolute -top-1 -right-1 md:right-4 bg-blue-500 text-white text-xs 
										rounded-full size-3 md:size-4 flex items-center justify-center'
										>
											{unreadNotificationCount}
										</span>
									)}
								</Link>
								
								{/* Profile dropdown */}
								<div className="relative" ref={dropdownRef}>
									<button 
										onClick={() => setShowDropdown(!showDropdown)}
										className="flex flex-col items-center focus:outline-none text-neutral"
									>
										<img 
											src={authUser.profilePicture || "/avatar.png"} 
											alt={authUser.name}
											className="w-6 h-6 rounded-full border-2 border-gray-200" 
										/>
										<div className="flex items-center mt-1">
											<span className='text-[11px] hidden md:block'>Me</span>
											<ChevronDown size={14} className="ml-0.5 hidden md:block" />
										</div>
									</button>
									
									{showDropdown && (
										<div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
											<div className="py-1">
												<div className="px-4 py-2 border-b">
													<div className="flex items-center">
														<img 
															src={authUser.profilePicture || "/avatar.png"} 
															alt={authUser.name}
															className="w-10 h-10 rounded-full mr-3" 
														/>
														<div>
															<p className="font-medium text-sm">{authUser.name}</p>
															<p className="text-xs text-gray-500">{authUser.headline}</p>
														</div>
													</div>
												</div>
												<Link
													to={`/profile/${authUser.username}`}
													onClick={() => setShowDropdown(false)}
													className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
												>
													<div className="flex items-center">
														<User size={16} className="mr-2" />
														View Profile
													</div>
												</Link>
												<button
													onClick={() => {
														logout();
														setShowDropdown(false);
													}}
													className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
												>
													<div className="flex items-center text-red-600">
														<LogOut size={16} className="mr-2" />
														Logout
													</div>
												</button>
											</div>
										</div>
									)}
								</div>
							</>
						) : (
							<>
								<Link to='/login' className='btn btn-ghost'>
									Sign In
								</Link>
								<Link to='/signup' className='btn btn-primary'>
									Join now
								</Link>
							</>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
};
export default Navbar;
