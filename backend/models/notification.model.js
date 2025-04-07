import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
	{
		recipient: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		sender: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		type: {
			type: String,
			enum: [
				"connection_request",
				"connection_accepted",
				"post_like",
				"post_comment",
				"project_comment",
				"project_application",
				"application_accepted",
				"application_rejected",
				"team_joined",
				"project_upvote"
			],
			required: true,
		},
		post: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
		},
		comment: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment",
		},
		project: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Project",
		},
		read: {
			type: Boolean,
			default: false,
		},
		createdAt: {
			type: Date,
			default: Date.now,
			expires: 30 * 24 * 60 * 60, // Auto-expire after 30 days
		},
	},
	{ timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
