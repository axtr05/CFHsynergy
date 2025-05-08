import { Link } from "react-router-dom";
import { Home, UserPlus, Bell, Users } from "lucide-react";

export default function Sidebar({ user }) {
	// Make sure user exists and has the required properties
	if (!user) {
		return (
			<div className='bg-secondary rounded-lg shadow p-4'>
				<div className='animate-pulse'>
					<div className='h-16 bg-gray-300 rounded-t-lg'></div>
					<div className='w-20 h-20 bg-gray-300 rounded-full mx-auto mt-[-40px]'></div>
					<div className='h-6 bg-gray-300 rounded mt-2 mx-auto w-2/3'></div>
					<div className='h-4 bg-gray-300 rounded mt-2 mx-auto w-1/2'></div>
					<div className='h-4 bg-gray-300 rounded mt-2 mx-auto w-1/3'></div>
				</div>
			</div>
		);
	}

	return (
		<div className='bg-secondary rounded-lg shadow'>
			<div className='p-4 text-center'>
				<div
					className='h-16 rounded-t-lg bg-cover bg-center'
					style={{
						backgroundImage: `url("${user?.bannerImg || "/banner.png"}")`,
					}}
				/>
				<Link to={`/profile/${user?.username}`}>
					<img
						src={user?.profilePicture || "/avatar.png"}
						alt={user?.name}
						className='w-20 h-20 rounded-full mx-auto mt-[-40px]'
					/>
					<h2 className='text-xl font-semibold mt-2'>{user?.name}</h2>
				</Link>
				<p className='text-info'>{user?.headline}</p>
				<p className='text-info text-xs'>{user?.connections?.length || 0} connections</p>
			</div>
			<div className='border-t border-base-100 p-4'>
				<nav>
					<ul className='space-y-2'>
						<li>
							<Link
								to='/'
								className='flex items-center py-2 px-4 rounded-md hover:bg-primary hover:text-white transition-colors'
							>
								<Home className='mr-2' size={20} /> Home
							</Link>
						</li>
						<li>
							<Link
								to='/network'
								className='flex items-center py-2 px-4 rounded-md hover:bg-primary hover:text-white transition-colors'
							>
								<UserPlus className='mr-2' size={20} /> My Network
							</Link>
						</li>
						<li>
							<Link
								to='/notifications'
								className='flex items-center py-2 px-4 rounded-md hover:bg-primary hover:text-white transition-colors'
							>
								<Bell className='mr-2' size={20} /> Notifications
							</Link>
						</li>
						{user?.userRole === "job_seeker" && (
							<li>
								<Link
									to='/all-connections'
									className='flex items-center py-2 px-4 rounded-md hover:bg-primary hover:text-white transition-colors'
								>
									<Users className='mr-2' size={20} /> All Connections
								</Link>
							</li>
						)}
					</ul>
				</nav>
			</div>
			<div className='border-t border-base-100 p-4'>
				<Link to={`/profile/${user?.username}`} className='text-sm font-semibold'>
					Visit your profile
				</Link>
			</div>
		</div>
	);
}
