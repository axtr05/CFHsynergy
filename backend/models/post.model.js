import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
	{
		author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		content: { type: String, required: true },
		images: [{ 
			url: { type: String },
			cloudinaryId: { type: String },
			aspectRatio: { 
				type: String, 
				enum: ["1:1", "1.91:1", "4:5"],
				default: "1:1"
			}
		}],
		likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
		comments: [
			{
				content: { type: String },
				user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
				createdAt: { type: Date, default: Date.now },
				edited: { type: Boolean, default: false },
				likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
				dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
			},
		],
		image: { type: String },
		cloudinaryId: {
			type: String,
			// This will store the Cloudinary public_id for deleting images later
		},
	},
	{ timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
