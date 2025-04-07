import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		username: { type: String, required: true, unique: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		profilePicture: {
			type: String,
			default: "",
		},
		bannerImg: {
			type: String,
			default: "",
		},
		headline: {
			type: String,
			default: function() {
				const role = this.userRole;
				if (role === 'investor') return "Investor";
				if (role === 'founder') return "Founder";
				if (role === 'jobseeker') return "Job Seeker";
				return "User";
			}
		},
		location: {
			type: String,
			default: "Hyderabad, Telangana, India",
		},
		about: {
			type: String,
			default: "",
		},
		isVerified: {
			type: Boolean,
			default: false,
		},
		organization: {
			type: String,
			default: "",
		},
		club: {
			type: String,
			default: "",
		},
		orgLogo: {
			type: String,
			default: "",
		},
		orgLogoId: {
			type: String,
			default: "",
		},
		linkedin: {
			type: String,
			default: "",
		},
		phone: {
			type: String,
			default: "",
		},
		// Role-related fields
		userRole: {
			type: String,
			enum: ["founder", "investor", "jobseeker"],
			default: "founder",
		},
		// For investors
		investmentRange: {
			min: {
				type: Number,
				default: 0,
			},
			max: {
				type: Number,
				default: 0,
			},
		},
		investmentInterests: [String], // Domains the investor is interested in
		// For job seekers
		currentRole: {
			type: String,
			default: "",
		},
		currentStartup: {
			startupId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "Project", // Will create this model
			},
			role: {
				type: String,
				default: "",
			},
			joinDate: {
				type: Date,
			},
		},
		pastStartups: [
			{
				startupId: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Project",
				},
				role: {
					type: String,
				},
				joinDate: {
					type: Date,
				},
				exitDate: {
					type: Date,
				},
			},
		],
		birthDate: {
			type: Date,
		},
		skills: [String],
		experience: [
			{
				title: String,
				company: String,
				startDate: Date,
				endDate: Date,
				description: String,
				logo: String,
				logoId: String,
			},
		],
		education: [
			{
				school: String,
				fieldOfStudy: String,
				startYear: Number,
				endYear: Number,
				logo: String,
				logoId: String,
			},
		],
		connections: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		connectionDates: [
			{
				userId: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "User",
				},
				date: {
					type: Date,
					default: Date.now,
				},
			},
		],
		profilePictureId: {
			type: String,
		},
		bannerImgId: {
			type: String,
		},
		// Optional flag to track if the user has completed initial onboarding
		onboardingCompleted: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
