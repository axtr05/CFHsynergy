import { useState } from "react";
import { Pencil } from "lucide-react";

const AboutSection = ({ userData, isOwnProfile, onSave }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [about, setAbout] = useState(userData.about || "");

	const handleSave = () => {
		setIsEditing(false);
		onSave({ about });
	};
	return (
		<div className='bg-white shadow-md rounded-xl p-6 mb-6'>
			<div className="flex justify-between items-center mb-4">
				<h2 className='text-xl font-semibold'>About</h2>
				{isOwnProfile && !isEditing && (
					<button
						onClick={() => setIsEditing(true)}
						className='text-primary hover:text-primary-dark transition-colors flex items-center gap-1 text-sm font-medium'
					>
						<Pencil size={16} />
						Edit
					</button>
				)}
			</div>
			
			{isEditing ? (
				<div className="space-y-3">
					<textarea
						value={about}
						onChange={(e) => setAbout(e.target.value)}
						className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all'
						rows='5'
						placeholder="Write something about yourself..."
					/>
					<div className="flex justify-end gap-2">
						<button
							onClick={() => setIsEditing(false)}
							className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium'
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							className='px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition duration-300 font-medium'
						>
							Save
						</button>
					</div>
				</div>
			) : (
				<div className="text-gray-700 leading-relaxed">
					{userData.about ? (
						<p>{userData.about}</p>
					) : (
						<p className="text-gray-500 italic">
							{isOwnProfile ? "Add information about yourself" : "No information available"}
						</p>
					)}
				</div>
			)}
		</div>
	);
};
export default AboutSection;
