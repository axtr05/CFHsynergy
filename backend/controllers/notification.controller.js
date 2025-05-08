import Notification from "../models/notification.model.js";

export const getUserNotifications = async (req, res) => {
	try {
		const notifications = await Notification.find({ recipient: req.user._id })
			.sort({ createdAt: -1 })
			.populate("sender", "name username profilePicture headline")
			.populate("post", "content image")
			.populate("project", "name description poster")
			.populate("comment", "content");

		res.status(200).json(notifications);
	} catch (error) {
		console.error("Error in getUserNotifications controller:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const markNotificationAsRead = async (req, res) => {
	const notificationId = req.params.id;
	try {
		const notification = await Notification.findByIdAndUpdate(
			{ _id: notificationId, recipient: req.user._id },
			{ read: true },
			{ new: true }
		);

		res.json(notification);
	} catch (error) {
		console.error("Error in markNotificationAsRead controller:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const deleteNotification = async (req, res) => {
	const notificationId = req.params.id;

	try {
		await Notification.findOneAndDelete({
			_id: notificationId,
			recipient: req.user._id,
		});

		res.json({ message: "Notification deleted successfully" });
	} catch (error) {
		res.status(500).json({ message: "Server error" });
	}
};

export const markAllNotificationsAsRead = async (req, res) => {
	try {
		await Notification.updateMany(
			{ recipient: req.user._id, read: false },
			{ read: true }
		);

		res.json({ message: "All notifications marked as read" });
	} catch (error) {
		console.error("Error in markAllNotificationsAsRead controller:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Debug function to reset notifications for testing
export const resetNotifications = async (req, res) => {
	try {
		// Only allow in development environment
		if (process.env.NODE_ENV === 'production') {
			return res.status(403).json({ message: "This endpoint is disabled in production" });
		}

		const userId = req.user._id;

		// Delete all existing notifications for this user
		await Notification.deleteMany({ recipient: userId });

		// Create test notifications for all types
		const testNotifications = [
			{
				recipient: userId,
				sender: userId, // Self-notification for testing
				type: "post_like",
				content: "Test notification for post like"
			},
			{
				recipient: userId,
				sender: userId,
				type: "connection_request",
				content: "Test connection request notification"
			},
			{
				recipient: userId,
				sender: userId,
				type: "application_accepted",
				content: "Your application for Frontend Developer role has been accepted!"
			},
			{
				recipient: userId,
				sender: userId,
				type: "application_rejected",
				content: "Your application for UX Designer role has been rejected"
			}
		];

		// Insert all test notifications
		await Notification.insertMany(testNotifications);

		// Return count of created notifications
		res.status(200).json({ 
			message: "Notifications reset successfully", 
			count: testNotifications.length 
		});
	} catch (error) {
		console.error("Error in resetNotifications:", error);
		res.status(500).json({ message: "Server error" });
	}
};
