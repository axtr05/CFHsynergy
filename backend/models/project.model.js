import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    founder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    poster: {
      type: String,
      default: "",
    },
    posterId: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Artificial Intelligence",
        "Creativity",
        "Cyber Security",
        "E-Commerce",
        "Education",
        "Finance",
        "Fitness",
        "Gaming",
        "Marketing",
        "Nonprofits",
        "Real Estate",
        "Software",
        "Travel",
        "Web 3"
      ],
      required: true,
    },
    teamSize: {
      type: Number,
      default: 1,
    },
    website: {
      type: String,
      default: "",
    },
    stage: {
      type: String,
      enum: ["idea", "buildingMVP", "MVP", "prototype", "fundraising", "growth", "exit"],
      default: "idea",
    },
    openRoles: [
      {
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          default: "",
        },
        limit: {
          type: Number,
          default: 1,
        },
        filled: {
          type: Number,
          default: 0,
        }
      }
    ],
    teamMembers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          required: true,
        },
        joinDate: {
          type: Date,
          default: Date.now,
        }
      }
    ],
    applications: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        roleTitle: {
          type: String,
          required: true,
        },
        message: {
          type: String,
          default: "",
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        appliedDate: {
          type: Date,
          default: Date.now,
        }
      }
    ],
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    upvoteCount: {
      type: Number,
      default: 0,
    },
    investors: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        investmentAmount: {
          type: Number,
          default: 0,
        },
        investmentDate: {
          type: Date,
          default: Date.now,
        }
      }
    ]
  },
  { timestamps: true }
);

// Virtual for calculating available positions
projectSchema.virtual('availablePositions').get(function() {
  return this.teamSize - this.teamMembers.length;
});

// Pre-save middleware to update upvoteCount
projectSchema.pre('save', function(next) {
  if (this.isModified('upvotes')) {
    this.upvoteCount = this.upvotes.length;
  }
  next();
});

const Project = mongoose.model("Project", projectSchema);

export default Project; 