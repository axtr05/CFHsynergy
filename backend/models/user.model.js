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
			default: "CFHsynergy User",
		},
		location: {
			type: String,
			default: "Earth",
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
	},
	{ timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
