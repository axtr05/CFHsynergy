import { Briefcase, X, Plus, Pencil, Calendar } from "lucide-react";
import { useState } from "react";
import { formatDate } from "../utils/dateUtils";

const ExperienceSection = ({ userData, isOwnProfile, onSave }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [experiences, setExperiences] = useState(userData.experience || []);
	const [newExperience, setNewExperience] = useState({
		title: "",
		company: "",
		startDate: "",
		endDate: "",
		description: "",
		currentlyWorking: false,
	});

	const handleAddExperience = () => {
		if (newExperience.title && newExperience.company && newExperience.startDate) {
			setExperiences([...experiences, newExperience]);

			setNewExperience({
				title: "",
				company: "",
				startDate: "",
				endDate: "",
				description: "",
				currentlyWorking: false,
			});
		}
	};

	const handleDeleteExperience = (id) => {
		setExperiences(experiences.filter((exp) => exp._id !== id));
	};

	const handleSave = () => {
		onSave({ experience: experiences });
		setIsEditing(false);
	};

	const handleCurrentlyWorkingChange = (e) => {
		setNewExperience({
			...newExperience,
			currentlyWorking: e.target.checked,
			endDate: e.target.checked ? "" : newExperience.endDate,
		});
	};

	return (
		<div className='bg-white shadow-md rounded-xl p-6 mb-6'>
			<div className="flex justify-between items-center mb-5">
				<h2 className='text-xl font-semibold'>Experience</h2>
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

			{experiences && experiences.length > 0 ? (
				<div className="space-y-6">
					{experiences.map((exp) => (
						<div key={exp._id} className='relative pl-8 border-l-2 border-gray-100 pb-1'>
							<div className='absolute -left-3 top-0'>
								<div className="bg-primary/10 p-1.5 rounded-full">
									<Briefcase size={20} className='text-primary' />
								</div>
							</div>
							
							<div className="flex justify-between items-start">
								<div>
									<h3 className='font-semibold text-lg'>{exp.title}</h3>
									<p className='text-gray-700 font-medium'>{exp.company}</p>
									<div className='text-gray-500 text-sm flex items-center my-1'>
										<Calendar size={14} className='mr-1' />
										{formatDate(exp.startDate)} - {exp.endDate ? formatDate(exp.endDate) : "Present"}
									</div>
									<p className='text-gray-600 mt-2 text-sm'>{exp.description}</p>
								</div>
								
								{isEditing && (
									<button 
										onClick={() => handleDeleteExperience(exp._id)} 
										className='text-gray-400 hover:text-red-500 transition-colors p-1'
										aria-label="Delete experience"
									>
										<X size={18} />
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			) : (
				<p className="text-gray-500 italic">
					{isOwnProfile ? "Add your work experience" : "No work experience listed"}
				</p>
			)}

			{isEditing && (
				<div className='mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50'>
					<h3 className="font-medium text-gray-800 mb-4">Add New Experience</h3>
					
					<div className="space-y-4">
						<div>
							<label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
								Job Title *
							</label>
							<input
								id="title"
								type='text'
								placeholder='e.g., Software Engineer'
								value={newExperience.title}
								onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
								className='w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary'
							/>
						</div>
						
						<div>
							<label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
								Company *
							</label>
							<input
								id="company"
								type='text'
								placeholder='e.g., Acme Corporation'
								value={newExperience.company}
								onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
								className='w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary'
							/>
						</div>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
									Start Date *
								</label>
								<input
									id="startDate"
									type='date'
									value={newExperience.startDate}
									onChange={(e) => setNewExperience({ ...newExperience, startDate: e.target.value })}
									className='w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary'
								/>
							</div>
							
							{!newExperience.currentlyWorking && (
								<div>
									<label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
										End Date
									</label>
									<input
										id="endDate"
										type='date'
										value={newExperience.endDate}
										onChange={(e) => setNewExperience({ ...newExperience, endDate: e.target.value })}
										className='w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary'
									/>
								</div>
							)}
						</div>
						
						<div className='flex items-center'>
							<input
								type='checkbox'
								id='currentlyWorking'
								checked={newExperience.currentlyWorking}
								onChange={handleCurrentlyWorkingChange}
								className='mr-2 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary'
							/>
							<label htmlFor='currentlyWorking' className="text-sm text-gray-700">
								I currently work here
							</label>
						</div>
						
						<div>
							<label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
								Description
							</label>
							<textarea
								id="description"
								placeholder='Describe your responsibilities and achievements'
								value={newExperience.description}
								onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
								className='w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary'
								rows="4"
							/>
						</div>
					</div>
					
					<div className="flex justify-end gap-2 mt-4">
						<button
							onClick={handleAddExperience}
							className='bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition duration-300 flex items-center font-medium'
							disabled={!newExperience.title || !newExperience.company || !newExperience.startDate}
						>
							<Plus size={18} className="mr-1" />
							Add Experience
						</button>
					</div>
				</div>
			)}

			{isOwnProfile && isEditing && (
				<div className="flex justify-end gap-2 mt-4">
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
			)}
		</div>
	);
};
export default ExperienceSection;
