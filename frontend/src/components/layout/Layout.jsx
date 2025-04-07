import Navbar from "./Navbar";
import ProfileCompletionIndicator from "../ProfileCompletionIndicator";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

const Layout = ({ children }) => {
	const location = useLocation();
	const { data: user } = useQuery({
		queryKey: ["authUser"],
		queryFn: () => null,
		enabled: false,
	});
	
	// Only show the profile completion indicator if the user is logged in
	// and not on the profile, login, or signup pages
	const showProfileIndicator = !!user && 
		!location.pathname.includes('/profile/') && 
		!location.pathname.includes('/login') &&
		!location.pathname.includes('/signup');
	
	return (
		<div className='min-h-screen bg-base-100'>
			<Navbar />
			<main className='max-w-7xl mx-auto px-4 py-6'>{children}</main>
			{showProfileIndicator && <ProfileCompletionIndicator />}
		</div>
	);
};
export default Layout;
