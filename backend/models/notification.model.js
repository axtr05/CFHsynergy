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
				"connection_rejected",
				"connection_removed",
				"post_like",
				"post_comment",
				"project_comment",
				"project_application",
				"application_accepted",
				"application_rejected",
				"application_rejected_auto",
				"application_cancelled", 
				"team_member_left",
				"project_upvote"
			],
			required: true,
		},
		content: {
			type: String,
			default: ""
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
