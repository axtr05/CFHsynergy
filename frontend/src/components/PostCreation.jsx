import { useState } from "react";
import { Image, Video, FileText, BarChart3 } from "lucide-react";
import CreatePostModal from "./CreatePostModal";
import { toast } from "react-hot-toast";

const PostCreation = ({ user }) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [initialMediaType, setInitialMediaType] = useState(null);
	const [content, setContent] = useState("");
	const [selectedImages, setSelectedImages] = useState([]);

	// If the user object is undefined or not fully loaded, don't render the component
	if (!user) {
		return null;
	}

	const openModal = (mediaType = null) => {
		setInitialMediaType(mediaType);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setInitialMediaType(null);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!content.trim() && !selectedImages.length) {
			toast.error("Please add some content or an image to your post");
			return;
		}
		
		console.log("Submitting post with content:", content);

		// Continue with existing logic
	};

	return (
		<>
			<div className='bg-white rounded-lg shadow-sm border border-gray-100 mb-4 p-4'>
				<div className='flex space-x-3 items-center'>
					<img 
						src={user?.profilePicture || "/avatar.png"} 
						alt={user?.name || "User"} 
						className='w-12 h-12 rounded-full object-cover' 
					/>
					<button
						onClick={() => openModal()}
						className='w-full text-left p-3 rounded-full bg-gray-100 hover:bg-gray-200 focus:ring-0 text-gray-600 transition-colors duration-200'
					>
						What do you want to talk about?
					</button>
				</div>

				<div className='flex justify-between items-center mt-3 pt-3 border-t border-gray-100'>
					<button
						onClick={() => openModal('photo')}
						className='flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200 py-1 px-2 rounded-md hover:bg-gray-50'
					>
						<Image size={20} className='mr-2' />
						<span className="text-sm font-medium">Photo</span>
					</button>

					<button
						onClick={() => openModal('video')}
						className='flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200 py-1 px-2 rounded-md hover:bg-gray-50'
					>
						<Video size={20} className='mr-2' />
						<span className="text-sm font-medium">Video</span>
					</button>

					<button
						onClick={() => openModal('poll')}
						className='flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200 py-1 px-2 rounded-md hover:bg-gray-50'
					>
						<BarChart3 size={20} className='mr-2' />
						<span className="text-sm font-medium">Poll</span>
					</button>

					<button
						onClick={() => openModal('document')}
						className='flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200 py-1 px-2 rounded-md hover:bg-gray-50'
					>
						<FileText size={20} className='mr-2' />
						<span className="text-sm font-medium">Document</span>
					</button>
				</div>
			</div>

			<CreatePostModal 
				isOpen={isModalOpen}
				onClose={closeModal}
				user={user}
				initialMediaType={initialMediaType}
			/>
		</>
	);
};

export default PostCreation;
