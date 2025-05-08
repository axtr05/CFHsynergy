import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";
import { Loader, Mail, Lock, CheckCircle2 } from "lucide-react";

const LoginForm = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [rememberMe, setRememberMe] = useState(false);
	const queryClient = useQueryClient();

	const { mutate: loginMutation, isLoading } = useMutation({
		mutationFn: async (userData) => {
			const res = await axiosInstance.post("/auth/login", userData);
			return res.data;
		},
		onSuccess: (data) => {
			// Manually set the auth user data in the query cache
			queryClient.setQueryData(["authUser"], data);
			toast.success("Login successful!", {
				icon: <CheckCircle2 className="text-green-500" size={18} />,
				style: {
					borderRadius: '10px',
					background: '#fff',
					color: '#333',
				},
			});
		},
		onError: (err) => {
			toast.error(err.response?.data?.message || "Invalid credentials. Please try again.");
		},
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		loginMutation({ username, password, rememberMe });
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6 w-full">
			<div>
				<label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
					Username or Email
				</label>
				<div className="relative group">
					<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
						<Mail size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
					</div>
					<input
						id="username"
						type="text"
						placeholder="johndoe@example.com"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						className="pl-11 pr-4 py-3.5 w-full block bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-gray-400 font-medium text-gray-700"
						required
					/>
				</div>
			</div>
			
			<div>
				<div className="flex items-center justify-between mb-1.5">
					<label htmlFor="password" className="block text-sm font-medium text-gray-700">
						Password
					</label>
					<a href="#" className="text-xs text-blue-600 hover:underline font-medium">
						Forgot password?
					</a>
				</div>
				<div className="relative group">
					<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
						<Lock size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
					</div>
					<input
						id="password"
						type="password"
						placeholder="••••••••"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="pl-11 pr-4 py-3.5 w-full block bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-gray-400 font-medium text-gray-700"
						required
					/>
				</div>
			</div>
			
			<div className="flex items-center">
				<input
					id="remember-me"
					name="remember-me"
					type="checkbox"
					checked={rememberMe}
					onChange={(e) => setRememberMe(e.target.checked)}
					className="h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
				/>
				<label htmlFor="remember-me" className="ml-2.5 block text-sm text-gray-700 font-medium">
					Keep me signed in
				</label>
			</div>

			<button
				type="submit"
				className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md"
				disabled={isLoading}
			>
				{isLoading ? (
					<span className="flex items-center justify-center">
						<Loader className="w-5 h-5 animate-spin mr-2" />
						Signing in...
					</span>
				) : (
					"Sign in"
				)}
			</button>
		</form>
	);
};
export default LoginForm;
