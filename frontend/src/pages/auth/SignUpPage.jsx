import { Link } from "react-router-dom";
import SignUpForm from "../../components/auth/SignUpForm";

const SignUpPage = ({ onSignupSuccess }) => {
	return (
		<div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-gray-50">
			{/* Left side - Branding and quote */}
			<div className="md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24">
				<div className="max-w-lg mx-auto">
					<img className="h-12 mb-8" src="/small-logo.png" alt="CFH Synergy" />
					<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Join our community</h1>
					<p className="text-gray-600 text-lg mb-6">
						Connect with investors, founders, and talent to create the next big thing.
					</p>
					<div className="hidden md:block mt-12">
						<div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8 border border-gray-100 shadow-sm">
							<div className="flex">
								<span className="text-5xl text-blue-300 font-serif leading-none">"</span>
								<p className="text-gray-700 italic font-medium text-lg ml-2">
									The best way to predict the future is to create it. Join the innovators shaping tomorrow.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			{/* Right side - Signup Form */}
			<div className="md:w-1/2 bg-white flex flex-col justify-center p-8 md:p-16">
				<div className="max-w-md mx-auto w-full">
					<div className="text-center md:text-left mb-8">
						<h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
						<p className="text-gray-500 mt-2">Start your journey with CFH Synergy</p>
					</div>
					
					<SignUpForm onSignupSuccess={onSignupSuccess} />
					
					<div className="mt-8">
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-gray-200"></div>
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-4 bg-white text-gray-500">Already on CFH?</span>
							</div>
						</div>
						<div className="mt-6">
							<Link
								to="/login"
								className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-primary hover:bg-gray-50 transition-colors"
							>
								Sign in
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
export default SignUpPage;
