import { Link } from "react-router-dom";
import LoginForm from "../../components/auth/LoginForm";

const LoginPage = () => {
	return (
		<div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-gray-50">
			{/* Left side - Branding */}
			<div className="md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24">
				<div className="max-w-lg mx-auto">
					<img className="h-12 mb-8" src="/small-logo.png" alt="CFH Synergy" />
					<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Welcome back</h1>
					<p className="text-gray-600 text-lg mb-6">
						Connect with professionals, build your network, and discover new opportunities.
					</p>
					<div className="hidden md:block mt-12">
						<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-gray-100 shadow-sm">
							<div className="flex">
								<span className="text-5xl text-indigo-300 font-serif leading-none">"</span>
								<p className="text-gray-700 italic font-medium text-lg ml-2">
									Building connections is the cornerstone of success in today's professional landscape.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			{/* Right side - Login Form */}
			<div className="md:w-1/2 bg-white flex flex-col justify-center p-8 md:p-16">
				<div className="max-w-md mx-auto w-full">
					<div className="text-center md:text-left mb-8">
						<h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
						<p className="text-gray-500 mt-2">Enter your credentials to access your account</p>
					</div>
					
					<LoginForm />
					
					<div className="mt-8">
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-gray-200"></div>
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-4 bg-white text-gray-500">New to CFH Synergy?</span>
							</div>
						</div>
						<div className="mt-6">
							<Link
								to="/signup"
								className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-primary hover:bg-gray-50 transition-colors"
							>
								Create an account
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
export default LoginPage;
