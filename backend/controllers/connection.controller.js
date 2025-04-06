import { sendConnectionAcceptedEmail } from "../emails/emailHandlers.js";
import ConnectionRequest from "../models/connectionRequest.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const sendConnectionRequest = async (req, res) => {
	try {
		const { userId } = req.params;
		const senderId = req.user._id;

		if (senderId.toString() === userId) {
			return res.status(400).json({ message: "You can't send a request to yourself" });
		}

		if (req.user.connections.includes(userId)) {
			return res.status(400).json({ message: "You are already connected" });
		}

		const existingRequest = await ConnectionRequest.findOne({
			sender: senderId,
			recipient: userId,
			status: "pending",
		});

		if (existingRequest) {
			return res.status(400).json({ message: "A connection request already exists" });
		}

		const newRequest = new ConnectionRequest({
			sender: senderId,
			recipient: userId,
		});

		await newRequest.save();

		res.status(201).json({ message: "Connection request sent successfully" });
	} catch (error) {
		res.status(500).json({ message: "Server error" });
	}
};

export const acceptConnectionRequest = async (req, res) => {
	try {
		const { requestId } = req.params;
		const userId = req.user._id;

		const request = await ConnectionRequest.findById(requestId)
			.populate("sender", "name email username")
			.populate("recipient", "name username");

		if (!request) {
			return res.status(404).json({ message: "Connection request not found" });
		}

		// check if the req is for the current user
		if (request.recipient._id.toString() !== userId.toString()) {
			return res.status(403).json({ message: "Not authorized to accept this request" });
		}

		if (request.status !== "pending") {
			return res.status(400).json({ message: "This request has already been processed" });
		}

		request.status = "accepted";
		const connectionDate = new Date();
		request.acceptedAt = connectionDate;
		await request.save();

		// if im your friend then ur also my friend ;)
		// Add the connection with the current timestamp
		await User.findByIdAndUpdate(
			request.sender._id, 
			{ 
				$addToSet: { 
					connections: userId 
				},
				// Store the connection date for the sender
				$push: { 
					connectionDates: { 
						userId: userId, 
						date: connectionDate 
					} 
				}
			}
		);
		
		await User.findByIdAndUpdate(
			userId, 
			{ 
				$addToSet: { 
					connections: request.sender._id 
				},
				// Store the connection date for the recipient
				$push: { 
					connectionDates: { 
						userId: request.sender._id, 
						date: connectionDate 
					} 
				}
			}
		);

		const notification = new Notification({
			recipient: request.sender._id,
			type: "connectionAccepted",
			relatedUser: userId,
		});

		await notification.save();

		res.json({ message: "Connection accepted successfully" });

		const senderEmail = request.sender.email;
		const senderName = request.sender.name;
		const recipientName = request.recipient.name;
		const profileUrl = process.env.CLIENT_URL + "/profile/" + request.recipient.username;

		try {
			await sendConnectionAcceptedEmail(senderEmail, senderName, recipientName, profileUrl);
		} catch (error) {
			console.error("Error in sendConnectionAcceptedEmail:", error);
		}
	} catch (error) {
		console.error("Error in acceptConnectionRequest controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const rejectConnectionRequest = async (req, res) => {
	try {
		const { requestId } = req.params;
		const userId = req.user._id;

		const request = await ConnectionRequest.findById(requestId);

		if (request.recipient.toString() !== userId.toString()) {
			return res.status(403).json({ message: "Not authorized to reject this request" });
		}

		if (request.status !== "pending") {
			return res.status(400).json({ message: "This request has already been processed" });
		}

		request.status = "rejected";
		await request.save();

		res.json({ message: "Connection request rejected" });
	} catch (error) {
		console.error("Error in rejectConnectionRequest controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const getConnectionRequests = async (req, res) => {
	try {
		const userId = req.user._id;

		const requests = await ConnectionRequest.find({ recipient: userId, status: "pending" }).populate(
			"sender",
			"name username profilePicture headline connections"
		);

		res.json(requests);
	} catch (error) {
		console.error("Error in getConnectionRequests controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const getUserConnections = async (req, res) => {
	try {
		const userId = req.user._id;

		const user = await User.findById(userId).populate(
			"connections",
			"name username profilePicture headline connections"
		);

		res.json(user.connections);
	} catch (error) {
		console.error("Error in getUserConnections controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const removeConnection = async (req, res) => {
	try {
		const myId = req.user._id;
		const { userId } = req.params;

		await User.findByIdAndUpdate(myId, { $pull: { connections: userId } });
		await User.findByIdAndUpdate(userId, { $pull: { connections: myId } });

		res.json({ message: "Connection removed successfully" });
	} catch (error) {
		console.error("Error in removeConnection controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const getConnectionStatus = async (req, res) => {
	try {
		const targetUserId = req.params.userId;
		const currentUserId = req.user._id;

		const currentUser = await User.findById(req.user._id);
		if (currentUser.connections.includes(targetUserId)) {
			// Find the connection date
			const connectionDateEntry = currentUser.connectionDates.find(
				entry => entry.userId.toString() === targetUserId.toString()
			);
			
			return res.json({ 
				status: "connected",
				connectionDate: connectionDateEntry ? connectionDateEntry.date : null
			});
		}

		const pendingRequest = await ConnectionRequest.findOne({
			$or: [
				{ sender: currentUserId, recipient: targetUserId },
				{ sender: targetUserId, recipient: currentUserId },
			],
			status: "pending",
		});

		if (pendingRequest) {
			if (pendingRequest.sender.toString() === currentUserId.toString()) {
				return res.json({ status: "pending" });
			} else {
				return res.json({ status: "received", requestId: pendingRequest._id });
			}
		}

		// if no connection or pending req found
		res.json({ status: "not_connected" });
	} catch (error) {
		console.error("Error in getConnectionStatus controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const getUserConnectionsByUsername = async (req, res) => {
	try {
		const { username } = req.params;
		
		const user = await User.findOne({ username }).populate(
			"connections",
			"name username profilePicture headline connections"
		);
		
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		
		res.json(user.connections);
	} catch (error) {
		console.error("Error in getUserConnectionsByUsername controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const getMutualConnections = async (req, res) => {
	try {
		const { userId } = req.params;
		const currentUserId = req.user._id;
		
		// Get current user with connections
		const currentUser = await User.findById(currentUserId);
		if (!currentUser) {
			return res.status(404).json({ message: "Current user not found" });
		}
		
		// Get target user with connections
		const targetUser = await User.findById(userId);
		if (!targetUser) {
			return res.status(404).json({ message: "Target user not found" });
		}
		
		// Find mutual connections (the intersection of both connection arrays)
		const mutualConnectionIds = currentUser.connections.filter(connection => 
			targetUser.connections.some(targetConnection => 
				targetConnection.toString() === connection.toString()
			)
		);
		
		// Get detailed information for mutual connections
		const mutualConnections = await User.find({
			_id: { $in: mutualConnectionIds }
		}).select("name username profilePicture headline connections");
		
		res.json(mutualConnections);
	} catch (error) {
		console.error("Error in getMutualConnections controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};
