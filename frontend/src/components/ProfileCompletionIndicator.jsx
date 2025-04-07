import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { User } from "lucide-react";

const ProfileCompletionIndicator = () => {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  
  const { data: user } = useQuery({
    queryKey: ["authUser"],
    queryFn: () => axiosInstance.get("/auth/me").then(res => res.data),
  });

  // Calculate profile completion percentage
  const calculateCompletionPercentage = () => {
    if (!user) return 0;
    
    let totalFields = 0;
    let completedFields = 0;
    
    // Basic fields
    const basicFields = ["name", "username", "email", "profilePicture", "headline", "about", "location", "phone", "linkedin"];
    totalFields += basicFields.length;
    
    basicFields.forEach(field => {
      if (user[field] && user[field] !== "") {
        completedFields++;
      }
    });
    
    // Role-specific fields
    if (user.userRole === "founder" || user.userRole === "jobseeker") {
      totalFields += 3; // Skills, education, experience
      
      if (user.skills && user.skills.length > 0) completedFields++;
      if (user.education && user.education.length > 0) completedFields++;
      if (user.experience && user.experience.length > 0) completedFields++;
    }
    
    if (user.userRole === "investor") {
      totalFields += 2; // Investment range and interests
      
      if (user.investmentRange && (user.investmentRange.min > 0 || user.investmentRange.max > 0)) {
        completedFields++;
      }
      
      if (user.investmentInterests && user.investmentInterests.length > 0) {
        completedFields++;
      }
    }
    
    return Math.floor((completedFields / totalFields) * 100);
  };
  
  const completionPercentage = calculateCompletionPercentage();

  // Hide the indicator if profile is complete or after dismissal
  useEffect(() => {
    if (user?.onboardingCompleted && completionPercentage === 100) {
      setIsVisible(false);
    }
    
    // Check if user has dismissed this indicator before
    const hasSkipped = localStorage.getItem("profile-completion-skipped");
    if (hasSkipped) {
      setIsVisible(false);
    }
  }, [user, completionPercentage]);
  
  const handleSkip = () => {
    localStorage.setItem("profile-completion-skipped", "true");
    setIsVisible(false);
  };
  
  const handleCompleteProfile = () => {
    navigate(`/profile/${user.username}`);
  };
  
  if (!isVisible || !user) return null;
  
  return (
    <div className="fixed bottom-6 right-6 z-30 max-w-sm w-full bg-white rounded-lg shadow-lg p-4 border border-gray-200 animate-slideInRight">
      <div className="absolute top-2 right-2">
        <button 
          onClick={handleSkip}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          SKIP FOR NOW
        </button>
      </div>
      
      <h3 className="font-bold mb-2">Complete Your Profile!</h3>
      <p className="text-gray-600 text-sm mb-4">
        Improve your connections by completing your profile. This will help you join
        projects and find great team members for your own projects.
      </p>
      
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Profile Completion:</span>
        <span className="text-sm font-medium">{completionPercentage}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full" 
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>
      
      <button
        onClick={handleCompleteProfile}
        className="w-full bg-blue-600 text-white py-2 rounded-md flex items-center justify-center hover:bg-blue-700 transition-colors"
      >
        <User size={18} className="mr-2" />
        COMPLETE PROFILE
      </button>
    </div>
  );
};

export default ProfileCompletionIndicator; 