import Navbar from "./Navbar";
import Footer from "./Footer";
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
	
	// Check if we're on the landing page
	const isLandingPage = location.pathname === '/';
	
	return (
		<div className="flex flex-col min-h-screen">
			<Navbar />
			{isLandingPage ? (
				// Full width main content for landing page with small margin
				<main className="flex-grow mt-2">{children}</main>
			) : (
				// Width-constrained main content for other pages with margin-top
				<main className="flex-grow max-w-7xl mx-auto px-4 py-6 mt-4 w-full">{children}</main>
			)}
			{showProfileIndicator && <ProfileCompletionIndicator />}
			{!isLandingPage && <Footer />}
		</div>
	);
};

export default Layout;
