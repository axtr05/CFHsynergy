import { Loader } from "lucide-react";

export default function PostAction({ icon, text, onClick, className = "", isLoading = false }) {
	return (
		<button 
			className={`flex items-center py-1.5 px-4 hover:bg-gray-50 rounded-md transition-colors ${className} ${isLoading ? 'opacity-70 cursor-wait' : ''}`} 
			onClick={onClick}
			disabled={isLoading}
		>
			<span className='mr-1.5'>
				{isLoading ? <Loader size={18} className="animate-spin" /> : icon}
			</span>
			<span className='text-sm font-medium'>{text}</span>
		</button>
	);
}
