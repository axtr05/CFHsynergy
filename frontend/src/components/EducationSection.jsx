import { School, X, Plus, Pencil, Calendar } from "lucide-react";
import { useState } from "react";

const EducationSection = ({ userData, isOwnProfile, onSave }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [educations, setEducations] = useState(userData.education || []);
	const [newEducation, setNewEducation] = useState({
		school: "",
		fieldOfStudy: "",
		startYear: "",
		endYear: "",
	});

	const handleAddEducation = () => {
		if (newEducation.school && newEducation.fieldOfStudy && newEducation.startYear) {
			setEducations([...educations, newEducation]);
			setNewEducation({
				school: "",
				fieldOfStudy: "",
				startYear: "",
				endYear: "",
			});
		}
	};

	const handleDeleteEducation = (id) => {
		setEducations(educations.filter((edu) => edu._id !== id));
	};

	const handleSave = () => {
		onSave({ education: educations });
		setIsEditing(false);
	};

	return (
		<div className='bg-white shadow-md rounded-xl p-6 mb-6'>
			<div className="flex justify-between items-center mb-5">
				<h2 className='text-xl font-semibold'>Education</h2>
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

			{educations && educations.length > 0 ? (
				<div className="space-y-6">
					{educations.map((edu) => (
						<div key={edu._id} className='relative pl-8 border-l-2 border-gray-100 pb-1'>
							<div className='absolute -left-3 top-0'>
								<div className="bg-primary/10 p-1.5 rounded-full">
									<School size={20} className='text-primary' />
								</div>
							</div>
							
							<div className="flex justify-between items-start">
								<div>
									<h3 className='font-semibold text-lg'>{edu.fieldOfStudy}</h3>
									<p className='text-gray-700 font-medium'>{edu.school}</p>
									<div className='text-gray-500 text-sm flex items-center my-1'>
										<Calendar size={14} className='mr-1' />
										{edu.startYear} - {edu.endYear || "Present"}
									</div>
								</div>
								
								{isEditing && (
									<button 
										onClick={() => handleDeleteEducation(edu._id)} 
										className='text-gray-400 hover:text-red-500 transition-colors p-1'
										aria-label="Delete education"
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
					{isOwnProfile ? "Add your educational background" : "No education listed"}
				</p>
			)}

			{isEditing && (
				<div className='mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50'>
					<h3 className="font-medium text-gray-800 mb-4">Add New Education</h3>
					
					<div className="space-y-4">
						<div>
							<label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-1">
								School / University *
							</label>
							<input
								id="school"
								type='text'
								placeholder='e.g., Stanford University'
								value={newEducation.school}
								onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })}
								className='w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary'
							/>
						</div>
						
						<div>
							<label htmlFor="fieldOfStudy" className="block text-sm font-medium text-gray-700 mb-1">
								Degree / Field of Study *
							</label>
							<input
								id="fieldOfStudy"
								type='text'
								placeholder='e.g., Bachelor of Science in Computer Science'
								value={newEducation.fieldOfStudy}
								onChange={(e) => setNewEducation({ ...newEducation, fieldOfStudy: e.target.value })}
								className='w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary'
							/>
						</div>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="startYear" className="block text-sm font-medium text-gray-700 mb-1">
									Start Year *
								</label>
								<input
									id="startYear"
									type='number'
									min="1900"
									max="2099"
									placeholder='e.g., 2018'
									value={newEducation.startYear}
									onChange={(e) => setNewEducation({ ...newEducation, startYear: e.target.value })}
									className='w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary'
								/>
							</div>
							
							<div>
								<label htmlFor="endYear" className="block text-sm font-medium text-gray-700 mb-1">
									End Year (or expected)
								</label>
								<input
									id="endYear"
									type='number'
									min="1900"
									max="2099"
									placeholder='e.g., 2022'
									value={newEducation.endYear}
									onChange={(e) => setNewEducation({ ...newEducation, endYear: e.target.value })}
									className='w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary'
								/>
							</div>
						</div>
					</div>
					
					<div className="flex justify-end gap-2 mt-4">
						<button
							onClick={handleAddEducation}
							className='bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition duration-300 flex items-center font-medium'
							disabled={!newEducation.school || !newEducation.fieldOfStudy || !newEducation.startYear}
						>
							<Plus size={18} className="mr-1" />
							Add Education
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
export default EducationSection;
