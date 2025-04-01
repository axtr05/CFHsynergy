import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { Image, Loader, X, Square, Maximize, Minimize } from "lucide-react";

const PostCreation = ({ user }) => {
	const [content, setContent] = useState("");
	const [imageFiles, setImageFiles] = useState([]);
	const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
	const [aspectRatio, setAspectRatio] = useState("1:1"); // Options: "1:1", "1.91:1", "4:5"
	const fileInputRef = useRef(null);

	const queryClient = useQueryClient();

	const { mutate: createPostMutation, isPending } = useMutation({
		mutationFn: async (postData) => {
			const res = await axiosInstance.post("/posts/create", postData, {
				headers: { "Content-Type": "application/json" },
			});
			return res.data;
		},
		onSuccess: () => {
			resetForm();
			toast.success("Post created successfully");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (err) => {
			toast.error(err.response.data.message || "Failed to create post");
		},
	});

	const handlePostCreation = async () => {
		try {
			const postData = { 
				content,
				aspectRatio // Include the selected aspect ratio
			};
			
			// Process multiple images
			if (imageFiles.length > 0) {
				const imageDataUrls = await Promise.all(
					imageFiles.map(file => readFileAsDataURL(file))
				);
				postData.images = imageDataUrls;
			}

			createPostMutation(postData);
		} catch (error) {
			console.error("Error in handlePostCreation:", error);
		}
	};

	const resetForm = () => {
		setContent("");
		setImageFiles([]);
		setImagePreviewUrls([]);
	};

	const handleImageChange = (e) => {
		const files = Array.from(e.target.files);
		if (files.length === 0) return;
		
		// Limit to 10 images
		const newFiles = [...imageFiles, ...files].slice(0, 10);
		setImageFiles(newFiles);
		
		// Create preview URLs for new files
		const newPreviewPromises = files.map(file => readFileAsDataURL(file));
		Promise.all(newPreviewPromises).then(newPreviews => {
			setImagePreviewUrls(prev => [...prev, ...newPreviews].slice(0, 10));
		});
	};

	const removeImage = (index) => {
		setImageFiles(prev => prev.filter((_, i) => i !== index));
		setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
	};

	const readFileAsDataURL = (file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	};

	const getAspectRatioClass = () => {
		switch (aspectRatio) {
			case "1:1": // Square
				return "aspect-[1/1]";
			case "1.91:1": // Landscape
				return "aspect-[1.91/1]";
			case "4:5": // Portrait
				return "aspect-[4/5]";
			default:
				return "aspect-[1/1]";
		}
	};

	const handleAspectRatioChange = (newRatio) => {
		setAspectRatio(newRatio);
	};

	return (
		<div className='bg-secondary rounded-lg shadow mb-4 p-4'>
			<div className='flex space-x-3'>
				<img src={user.profilePicture || "/avatar.png"} alt={user.name} className='size-12 rounded-full' />
				<textarea
					placeholder="What's on your mind?"
					className='w-full p-3 rounded-lg bg-base-100 hover:bg-base-200 focus:bg-base-200 focus:outline-none resize-none transition-colors duration-200 min-h-[100px]'
					value={content}
					onChange={(e) => setContent(e.target.value)}
				/>
			</div>

			{imagePreviewUrls.length > 0 && (
				<div className='mt-4'>
					<div className="flex items-center mb-2 justify-between">
						<div className="text-sm font-semibold">
							{imagePreviewUrls.length}/10 images
						</div>
						<div className="flex space-x-2">
							<button 
								onClick={() => handleAspectRatioChange("1:1")}
								className={`p-1 rounded ${aspectRatio === "1:1" ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
								title="Square (1:1)"
							>
								<Square size={16} />
							</button>
							<button 
								onClick={() => handleAspectRatioChange("1.91:1")}
								className={`p-1 rounded ${aspectRatio === "1.91:1" ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
								title="Landscape (1.91:1)"
							>
								<Maximize size={16} />
							</button>
							<button 
								onClick={() => handleAspectRatioChange("4:5")}
								className={`p-1 rounded ${aspectRatio === "4:5" ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
								title="Portrait (4:5)"
							>
								<Minimize size={16} />
							</button>
						</div>
					</div>
					
					<div className="flex overflow-x-auto space-x-2 py-2">
						{imagePreviewUrls.map((preview, index) => (
							<div 
								key={index} 
								className={`relative flex-shrink-0 bg-black ${getAspectRatioClass()} overflow-hidden rounded-md`} 
								style={{width: '120px'}}
							>
								<img 
									src={preview} 
									alt={`Preview ${index}`} 
									className="w-full h-full object-contain" 
								/>
								<button 
									className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
									onClick={() => removeImage(index)}
								>
									<X size={16} />
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			<div className='flex justify-between items-center mt-4'>
				<div className='flex space-x-4'>
					<label className='flex items-center text-info hover:text-info-dark transition-colors duration-200 cursor-pointer'>
						<Image size={20} className='mr-2' />
						<span>Photos</span>
						<input 
							type='file' 
							accept='image/*' 
							className='hidden' 
							onChange={handleImageChange} 
							multiple 
							ref={fileInputRef}
						/>
					</label>
				</div>

				<button
					className='bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors duration-200'
					onClick={handlePostCreation}
					disabled={isPending || (!content.trim() && imagePreviewUrls.length === 0)}
				>
					{isPending ? <Loader className='size-5 animate-spin' /> : "Share"}
				</button>
			</div>
		</div>
	);
};
export default PostCreation;
