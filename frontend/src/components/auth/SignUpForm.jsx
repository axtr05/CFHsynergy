import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios.js";
import { toast } from "react-hot-toast";
import { Loader } from "lucide-react";
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
		<form onSubmit={handleSignUp} className='flex flex-col gap-4'>
			<input
				type='text'
				placeholder='Full name'
				value={name}
				onChange={(e) => setName(e.target.value)}
				className='input input-bordered w-full'
				required
			/>
			<input
				type='text'
				placeholder='Username'
				value={username}
				onChange={(e) => setUsername(e.target.value)}
				className='input input-bordered w-full'
				required
			/>
			<input
				type='email'
				placeholder='Email'
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				className='input input-bordered w-full'
				required
			/>
			<input
				type='password'
				placeholder='Password (6+ characters)'
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				className='input input-bordered w-full'
				required
			/>

			<button type='submit' disabled={isSigningUp} className='btn btn-primary w-full text-white'>
				{isSigningUp ? <Loader className='size-5 animate-spin' /> : "Agree & Join"}
			</button>
		</form>
	);
};

export default SignUpForm;
