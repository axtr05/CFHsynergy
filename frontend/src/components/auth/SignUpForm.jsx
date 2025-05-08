import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios.js";
import { toast } from "react-hot-toast";
import { Loader, User, AtSign, Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SignUpForm = ({ onSignupSuccess }) => {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { mutate: signUpMutation, isLoading: isSigningUp } = useMutation({
		mutationFn: async (data) => {
			console.log("Signing up with data:", data);
			const res = await axiosInstance.post("/auth/signup", data);
			console.log("Signup response:", res.data);
			return res.data;
		},
		onSuccess: (data) => {
			toast.success("Account created successfully");
			console.log("Setting auth user data in cache:", data);
			
			// Immediately set the user data in the cache
			queryClient.setQueryData(["authUser"], data);
			
			// Set signup flag in session storage
			sessionStorage.setItem('justSignedUp', 'true');
			
			// Call the success callback if provided
			if (onSignupSuccess) {
				onSignupSuccess();
			}
			
			// Just navigate directly to role selection without checking auth status
			console.log("Navigating directly to role selection");
			// Use setTimeout to ensure React has time to process the state update
			setTimeout(() => {
				navigate("/role-selection", { replace: true });
			}, 100);
		},
		onError: (err) => {
			console.error("Signup error:", err);
			toast.error(err.response?.data?.message || "Something went wrong");
		},
	});

	const handleSignUp = (e) => {
		e.preventDefault();
		signUpMutation({ name, username, email, password });
	};

	return (
		<form onSubmit={handleSignUp} className="flex flex-col gap-6">
			<div className="relative group">
				<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
					<User size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
				</div>
				<input
					type="text"
					placeholder="John Doe"
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-gray-400 font-medium text-gray-700"
					required
				/>
			</div>
			
			<div className="relative group">
				<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
					<AtSign size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
				</div>
				<input
					type="text"
					placeholder="johndoe"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-gray-400 font-medium text-gray-700"
					required
				/>
			</div>
			
			<div className="relative group">
				<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
					<Mail size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
				</div>
				<input
					type="email"
					placeholder="johndoe@example.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-gray-400 font-medium text-gray-700"
					required
				/>
			</div>
			
			<div className="relative group">
				<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
					<Lock size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
				</div>
				<input
					type="password"
					placeholder="••••••••"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-gray-400 font-medium text-gray-700"
					required
					minLength={6}
				/>
			</div>

			<button 
				type="submit" 
				disabled={isSigningUp} 
				className="mt-2 w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center justify-center"
			>
				{isSigningUp ? (
					<span className="flex items-center justify-center">
						<Loader className="w-5 h-5 animate-spin mr-2" />
						Creating account...
					</span>
				) : (
					"Agree & Join"
				)}
			</button>
		</form>
	);
};

export default SignUpForm;
