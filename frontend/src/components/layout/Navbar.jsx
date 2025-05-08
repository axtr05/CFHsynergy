import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, Home, LogOut, User, Users, ChevronDown, Briefcase, RefreshCw, Menu, X, Search } from "lucide-react";
import SearchBar from "../SearchBar";
import { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";

const Navbar = () => {
	const navigate = useNavigate();
	const location = useLocation();
	
	const { data: authUser } = useQuery({ 
		queryKey: ["authUser"],
		queryFn: () => axiosInstance.get('/auth/me').then(res => res.data),
	});
	const queryClient = useQueryClient();
	const [showDropdown, setShowDropdown] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
	const dropdownRef = useRef(null);
	const mobileMenuRef = useRef(null);

	const { data: notifications } = useQuery({
		queryKey: ["notifications"],
		queryFn: async () => axiosInstance.get("/notifications"),
		enabled: !!authUser,
		refetchInterval: 20000,
		refetchOnWindowFocus: true,
	});

	const { data: connectionRequests } = useQuery({
		queryKey: ["connectionRequests"],
		queryFn: async () => axiosInstance.get("/connections/requests"),
		enabled: !!authUser,
		refetchInterval: 15000,
		refetchOnWindowFocus: true,
		refetchOnMount: true,
		retry: 3,
		staleTime: 10000,
	});

	useEffect(() => {
		if (authUser) {
			queryClient.prefetchQuery({
				queryKey: ["connectionRequests"],
				queryFn: async () => axiosInstance.get("/connections/requests"),
			});
		}
	}, [authUser, queryClient]);

	const { mutate: logout } = useMutation({
		mutationFn: () => axiosInstance.post("/auth/logout"),
		onSuccess: () => {
			toast.success("Logged out successfully");
			queryClient.setQueryData(["authUser"], null);
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
			navigate('/login');
		},
		onError: (error) => {
			toast.error("Error logging out. Please try again.");
			console.error("Logout error:", error);
		}
	});

	const { mutate: syncConnections } = useMutation({
		mutationFn: () => axiosInstance.post('/users/sync-connections'),
		onSuccess: (data) => {
			toast.success(`Connection sync complete. ${data.updatedUsers} users updated.`);
			queryClient.invalidateQueries({ queryKey: ["connections"] });
			setShowDropdown(false);
		},
		onError: (error) => {
			toast.error(error.response?.data?.message || "Only admins can perform this action");
		}
	});

	const unreadNotificationCount = notifications?.data?.filter((notif) => !notif.read)?.length || 0;
	const unreadConnectionRequestsCount = connectionRequests?.data?.length || 0;

	// Close mobile menu when navigating
	const handleNavigation = () => {
		setMobileMenuOpen(false);
		setMobileSearchOpen(false);
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setShowDropdown(false);
			}
			if (mobileMenuRef.current && 
				!mobileMenuRef.current.contains(event.target) && 
				!event.target.closest('.mobile-menu-toggle')) {
				setMobileMenuOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close mobile menu when screen size changes to desktop
	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 768) { // md breakpoint
				setMobileMenuOpen(false);
				setMobileSearchOpen(false);
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const renderNavLinks = () => (
		<>
			<Link to={"/"} onClick={handleNavigation} className="flex flex-col items-center text-neutral hover:text-primary transition-colors">
				<Home size={20} />
				<span className='text-[11px]'>Home</span>
			</Link>
			<Link to='/network' onClick={handleNavigation} className="flex flex-col items-center relative text-neutral hover:text-primary transition-colors">
				<Users size={20} />
				<span className='text-[11px]'>My Network</span>
				{unreadConnectionRequestsCount > 0 && (
					<span
						className='absolute -top-1 -right-1 md:right-4 bg-blue-500 text-white text-xs 
						rounded-full size-3 md:size-4 flex items-center justify-center'
					>
						{unreadConnectionRequestsCount}
					</span>
				)}
			</Link>
			<Link to='/projects' onClick={handleNavigation} className="flex flex-col items-center text-neutral hover:text-primary transition-colors">
				<Briefcase size={20} />
				<span className='text-[11px]'>Projects</span>
			</Link>
			<Link to='/notifications' onClick={handleNavigation} className="flex flex-col items-center relative text-neutral hover:text-primary transition-colors">
				<Bell size={20} />
				<span className='text-[11px]'>Notifications</span>
				{unreadNotificationCount > 0 && (
					<span
						className='absolute -top-1 -right-1 md:right-4 bg-blue-500 text-white text-xs 
						rounded-full size-3 md:size-4 flex items-center justify-center'
					>
						{unreadNotificationCount}
					</span>
				)}
			</Link>
		</>
	);

	return (
		<nav className="w-full z-50 bg-white border-b border-gray-200 shadow-sm">
			<div className='max-w-7xl mx-auto px-4'>
				<div className='flex justify-between items-center py-3'>
					{/* Logo */}
					<div className='flex items-center space-x-4'>
						<Link to='/'>
							<img className='h-8 rounded' src='/small-logo.png' alt='CFH Synergy' />
						</Link>
						{authUser && !mobileSearchOpen && (
							<div className="hidden md:block w-64">
								<SearchBar />
							</div>
						)}
					</div>
					
					{/* Mobile Search */}
					{authUser && mobileSearchOpen && (
						<div className="md:hidden flex-1 px-2">
							<SearchBar />
						</div>
					)}
					
					{/* Desktop Navigation */}
					<div className='hidden md:flex items-center gap-6'>
						{authUser ? (
							<>
								{renderNavLinks()}
								
								<div className="relative" ref={dropdownRef}>
									<button 
										onClick={() => setShowDropdown(!showDropdown)}
										className="flex flex-col items-center focus:outline-none text-neutral hover:text-primary transition-colors"
									>
										<img 
											src={authUser.profilePicture || "/avatar.png"} 
											alt={authUser.name}
											className="w-6 h-6 rounded-full border border-gray-300" 
										/>
										<div className="flex items-center mt-1">
											<span className='text-[11px]'>Me</span>
											<ChevronDown size={14} className="ml-0.5" />
										</div>
									</button>
									
									{showDropdown && (
										<div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-20">
											<div className="py-1">
												<div className="px-4 py-3 border-b">
													<div className="flex items-center">
														<img 
															src={authUser.profilePicture || "/avatar.png"} 
															alt={authUser.name}
															className="w-12 h-12 rounded-full mr-3" 
														/>
														<div>
															<p className="font-medium text-sm">{authUser.name}</p>
															<p className="text-xs text-gray-500 truncate max-w-[180px]">{authUser.headline || "No headline"}</p>
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
												{/* Admin-only tools */}
												{authUser && authUser.username === "admin" && (
													<>
														<div className="border-t border-gray-200 my-1"></div>
														<button
															onClick={() => syncConnections()}
															className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
														>
															<div className="flex items-center text-blue-600">
																<RefreshCw size={16} className="mr-2" />
																Sync Connections
															</div>
														</button>
													</>
												)}
											</div>
										</div>
									)}
								</div>
							</>
						) : (
							<>
								<Link to='/login' className="font-medium text-gray-600 hover:text-gray-900">
									Sign In
								</Link>
								<Link to='/signup' className="px-3 py-2 rounded font-medium bg-primary text-white hover:bg-primary-dark">
									Join now
								</Link>
							</>
						)}
					</div>
					
					{/* Mobile Controls */}
					{!mobileSearchOpen ? (
						<div className="md:hidden flex items-center space-x-2">
							{authUser && (
								<>
									{/* Search Button */}
									<button 
										onClick={() => setMobileSearchOpen(true)}
										className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
										aria-label="Search"
									>
										<Search size={20} />
									</button>
									
									{/* Notifications Button */}
									<Link 
										to="/notifications"
										className="p-2 rounded-full hover:bg-gray-100 text-gray-500 relative"
									>
										<Bell size={20} />
										{unreadNotificationCount > 0 && (
											<span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full size-4 flex items-center justify-center">
												{unreadNotificationCount}
											</span>
										)}
									</Link>
									
									{/* Menu Toggle Button */}
									<button 
										className="mobile-menu-toggle p-2 rounded-full hover:bg-gray-100 text-gray-500 focus:outline-none"
										onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
										aria-label="Toggle menu"
									>
										{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
									</button>
								</>
							)}
							
							{!authUser && (
								<div className="flex items-center space-x-4">
									<Link to='/login' className="text-sm font-medium text-gray-600">
										Sign In
									</Link>
									<Link to='/signup' className="px-3 py-1.5 rounded text-sm font-medium bg-primary text-white">
										Join
									</Link>
								</div>
							)}
						</div>
					) : (
						<button 
							onClick={() => setMobileSearchOpen(false)}
							className="md:hidden p-2 text-gray-500"
						>
							<X size={20} />
						</button>
					)}
				</div>
				
				{/* Mobile Menu Slide-Out */}
				{mobileMenuOpen && authUser && (
					<>
						{/* Backdrop overlay */}
						<div 
							className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
							onClick={() => setMobileMenuOpen(false)}
						></div>
						
						{/* Slide-in menu */}
						<div 
							ref={mobileMenuRef}
							className="fixed top-0 right-0 h-full w-[280px] max-w-[85%] bg-white shadow-xl z-50 transform transition-transform duration-300"
							style={{ transform: 'translateX(0)' }}
						>
							{/* Header */}
							<div className="p-4 border-b flex items-center justify-between bg-gray-50">
								<div className="flex items-center">
									<img 
										src={authUser.profilePicture || "/avatar.png"} 
										alt={authUser.name}
										className="w-10 h-10 rounded-full mr-3 border border-gray-200" 
									/>
									<div className="truncate">
										<p className="font-medium text-sm truncate">{authUser.name}</p>
										<p className="text-xs text-gray-500 truncate max-w-[160px]">{authUser.headline || "No headline"}</p>
									</div>
								</div>
								<button 
									onClick={() => setMobileMenuOpen(false)}
									className="p-1 rounded-full hover:bg-gray-200"
								>
									<X size={20} className="text-gray-500" />
								</button>
							</div>
							
							{/* Navigation Links */}
							<div className="p-4">
								<div className="grid grid-cols-2 gap-3 mb-6">
									<Link 
										to={`/profile/${authUser.username}`} 
										onClick={handleNavigation}
										className="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100"
									>
										<User size={18} className="text-primary mr-3" />
										<span className="font-medium text-sm">View Profile</span>
									</Link>
									
									<Link 
										to="/network" 
										onClick={handleNavigation}
										className="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 relative"
									>
										<Users size={18} className="text-primary mr-3" />
										<span className="font-medium text-sm">My Network</span>
										{unreadConnectionRequestsCount > 0 && (
											<span className="absolute top-2 right-2 bg-blue-500 text-white text-xs rounded-full size-5 flex items-center justify-center">
												{unreadConnectionRequestsCount}
											</span>
										)}
									</Link>
									
									<Link 
										to="/projects" 
										onClick={handleNavigation}
										className="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100"
									>
										<Briefcase size={18} className="text-primary mr-3" />
										<span className="font-medium text-sm">Projects</span>
									</Link>
									
									<Link 
										to="/notifications" 
										onClick={handleNavigation}
										className="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 relative"
									>
										<Bell size={18} className="text-primary mr-3" />
										<span className="font-medium text-sm">Notifications</span>
										{unreadNotificationCount > 0 && (
											<span className="absolute top-2 right-2 bg-blue-500 text-white text-xs rounded-full size-5 flex items-center justify-center">
												{unreadNotificationCount}
											</span>
										)}
									</Link>
								</div>
								
								{/* Admin-only tools */}
								{authUser && authUser.username === "admin" && (
									<div className="mt-6 mb-6 border-t border-gray-100 pt-4">
										<h4 className="text-xs uppercase text-gray-500 mb-2 px-2">Admin Tools</h4>
										<button
											onClick={() => {
												syncConnections();
												setMobileMenuOpen(false);
											}}
											className="w-full flex items-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-left"
										>
											<RefreshCw size={18} className="text-blue-600 mr-3" />
											<span className="font-medium text-sm">Sync Connections</span>
										</button>
									</div>
								)}
								
								{/* Logout Button */}
								<div className="mt-auto pt-4 border-t border-gray-100">
									<button
										onClick={() => {
											logout();
											setMobileMenuOpen(false);
										}}
										className="w-full flex items-center p-3 rounded-lg bg-red-50 hover:bg-red-100 text-left"
									>
										<LogOut size={18} className="text-red-600 mr-3" />
										<span className="font-medium text-sm">Logout</span>
									</button>
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</nav>
	);
};

export default Navbar;
