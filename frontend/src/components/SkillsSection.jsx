import { X, Plus, Pencil } from "lucide-react";
import { useState } from "react";

const SkillsSection = ({ userData, isOwnProfile, onSave }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [skills, setSkills] = useState(userData.skills || []);
	const [newSkill, setNewSkill] = useState("");

	const handleAddSkill = () => {
		if (newSkill && !skills.includes(newSkill)) {
			setSkills([...skills, newSkill]);
			setNewSkill("");
		}
	};

	const handleDeleteSkill = (skill) => {
		setSkills(skills.filter((s) => s !== skill));
	};

	const handleSave = () => {
		onSave({ skills });
		setIsEditing(false);
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddSkill();
		}
	};

	return (
		<div className='bg-white shadow-md rounded-xl p-6'>
			<div className="flex justify-between items-center mb-4">
				<h2 className='text-xl font-semibold'>Skills</h2>
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

			<div className='flex flex-wrap gap-2'>
				{skills && skills.length > 0 ? (
					skills.map((skill, index) => (
					<span
						key={index}
							className={`px-3 py-1.5 rounded-md text-sm font-medium ${
								isEditing 
									? 'bg-gray-100 text-gray-800 pr-2'
									: 'bg-primary/10 text-primary'
							}`}
					>
						{skill}
						{isEditing && (
								<button 
									onClick={() => handleDeleteSkill(skill)} 
									className='ml-2 text-gray-500 hover:text-red-500 transition-colors'
									aria-label="Remove skill"
								>
									<X size={16} />
							</button>
						)}
					</span>
					))
				) : (
					<p className="text-gray-500 italic">
						{isOwnProfile ? "Add skills to showcase your expertise" : "No skills listed"}
					</p>
				)}
			</div>

			{isEditing && (
				<div className='mt-5 space-y-4'>
					<div className='flex'>
					<input
						type='text'
							placeholder='Add a skill (e.g., JavaScript, Project Management)'
						value={newSkill}
						onChange={(e) => setNewSkill(e.target.value)}
							onKeyPress={handleKeyPress}
							className='flex-grow p-2.5 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all'
					/>
					<button
						onClick={handleAddSkill}
							className='bg-primary text-white py-2 px-4 rounded-r-md hover:bg-primary-dark transition duration-300 flex items-center'
							disabled={!newSkill.trim()}
					>
							<Plus size={18} className="mr-1" />
							Add
					</button>
				</div>
					
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
							Save Changes
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
export default SkillsSection;
