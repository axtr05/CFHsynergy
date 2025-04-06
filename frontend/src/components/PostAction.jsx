export default function PostAction({ icon, text, onClick, className = "" }) {
	return (
		<button className={`flex items-center py-1.5 px-4 hover:bg-gray-50 rounded-md transition-colors ${className}`} onClick={onClick}>
			<span className='mr-1.5'>{icon}</span>
			<span className='text-sm font-medium'>{text}</span>
		</button>
	);
}
