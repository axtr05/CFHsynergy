import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

// Import RoleCard component from RoleSelection but we'll customize the page here
import { CheckCircle } from "lucide-react";

const RoleCard = ({ 
  letter,
  title, 
  description, 
  bgColor,
  isSelected, 
  onClick,
  disabled
}) => {
  return (
    <div 
      className={`relative px-5 py-5 border rounded-lg ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} transition-all ${
        isSelected 
          ? "border-blue-600 bg-blue-50" 
          : "border-gray-200 hover:border-blue-300"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      {isSelected && (
        <div className="absolute right-4 top-4">
          <CheckCircle size={20} className="fill-blue-600 text-white" />
        </div>
      )}
      
      <div className="flex items-center">
        <div className={`${bgColor} w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0`}>
          <span className="text-xl font-bold text-white">{letter}</span>
        </div>
        
        <div>
          <h3 className="text-base font-semibold mb-1">{title}</h3>
          <p className="text-gray-500 text-sm leading-tight">{description}</p>
        </div>
      </div>
    </div>
  );
};

const RoleSelectionPage = () => {
  const [selectedRole, setSelectedRole] = useState("");
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Clear justSignedUp flag from session storage when component mounts
  useEffect(() => {
    const justSignedUp = sessionStorage.getItem("justSignedUp");
    if (justSignedUp) {
      console.log("Clearing justSignedUp flag from session storage");
      sessionStorage.removeItem("justSignedUp");
    }
  }, []);
  
  // Get user location from IP
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
          throw new Error('Failed to fetch location data');
        }
        const data = await response.json();
        setLocation(`${data.city}, ${data.region}, ${data.country_name}`);
      } catch (error) {
        console.error('Error fetching location:', error);
        setLocation('Hyderabad, Telangana, India');
      }
    };
    
    fetchLocation();
  }, []);
  
  // Get current user data
  const { data: userData, isLoading, isError } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/auth/me');
        return res.data;
      } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
    }
  });
  
  // Update user role mutation
  const { mutate: updateUserRole, isPending } = useMutation({
    mutationFn: async (roleData) => {
      try {
        const response = await axiosInstance.post('/auth/update-role', roleData);
        return response.data;
      } catch (error) {
        console.error('Error updating user role:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update the cache with new user data
      queryClient.setQueryData(['authUser'], (oldData) => {
        return { ...oldData, ...data };
      });
      
      // Invalidate queries to get fresh data
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
      
      // If needed, update the profile with additional data
      updateUserProfile();
      
      // Show success message with role title
      let roleTitle = '';
      switch (selectedRole) {
        case 'investor': roleTitle = 'Investor'; break;
        case 'founder': roleTitle = 'Founder'; break;
        case 'job_seeker': roleTitle = 'Job Seeker'; break;
        default: roleTitle = 'User';
      }
      
      toast.success(`Welcome! You're now registered as a ${roleTitle}`);
      
      // Navigate to the profile page after a short delay 
      // to ensure state is updated
      if (userData?.username) {
        setTimeout(() => {
          navigate(`/profile/${userData.username}`, { 
            state: { 
              newUser: true,
              userRole: selectedRole
            },
            replace: true 
          });
        }, 500);
      } else {
        // Fallback if username is not available
        navigate('/profile', { replace: true });
      }
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast.error(error?.response?.data?.message || 'Failed to update role. Please try again.');
    }
  });
  
  // Update user profile with location and investment range if applicable
  const updateUserProfile = async () => {
    try {
      // Prepare profile data based on selected role
      const profileData = {
        location: location || 'Hyderabad, Telangana, India'
      };
      
      // Set role-specific headline
      let headline = "";
      if (selectedRole === 'investor') {
        headline = "Investor";
        profileData.investmentRange = {
          min: 10000,
          max: 100000
        };
      } else if (selectedRole === 'founder') {
        headline = "Founder";
        // Founder-specific settings if needed
        profileData.founderInfo = {
          startupStage: 'idea', // Default stage
          lookingFor: ['funding', 'team'] // Default needs
        };
      } else if (selectedRole === 'job_seeker') {
        headline = "Job Seeker";
        // Job seeker specific settings if needed
        profileData.jobSeekerInfo = {
          openToRoles: ['fulltime', 'contract']
        };
      }
      
      // Add headline to profile data
      profileData.headline = headline;
      
      console.log("Updating user profile with:", profileData);
      
      // Update profile
      const response = await axiosInstance.put('/users/profile', profileData);
      console.log("Profile update response:", response.data);
      
      // Invalidate user profile queries to get fresh data
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      
    } catch (error) {
      console.error('Error updating profile:', error);
      // Don't show an error toast here, as the role update was successful
    }
  };
  
  // Handle continue button click
  const handleContinue = () => {
    if (!selectedRole) {
      setError("Please select a role to continue");
      return;
    }
    
    // Map frontend role to backend role format
    const backendRole = selectedRole === 'job_seeker' ? 'jobseeker' : selectedRole;
    
    // Just send the userRole, not the nested profile data
    const roleData = {
      userRole: backendRole
    };
    
    console.log("Updating user role to:", roleData);
    
    // Update user role
    updateUserRole(roleData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <p className="text-red-600 font-medium">Error loading user data. Please refresh the page or login again.</p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition duration-200 mt-2"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-8">
      <div className="w-full max-w-md px-4">
        <h2 className="text-center text-5xl font-bold mb-3 tracking-tight">
          <span className="text-black drop-shadow-sm">CFH</span><span className="text-blue-600 drop-shadow-sm">synergy</span>
        </h2>
        <h1 className="text-2xl font-bold text-center mt-2 mb-8">Find the investment you need</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-lg font-semibold text-center mb-1">
            What brings you to CFHsynergy?
          </h3>
          
          <p className="text-gray-500 text-center text-sm mb-5">
            Select the option that best describes you. This helps us personalize your experience.
          </p>
          
          <div className="flex flex-col space-y-4 mb-6">
            <RoleCard
              letter="F"
              title="Startup Founder"
              description="I have a startup idea or existing business and I'm looking for team members or investment."
              bgColor="bg-blue-500"
              isSelected={selectedRole === "founder"}
              onClick={() => {
                setSelectedRole("founder");
                setError("");
              }}
              disabled={isPending}
            />
            
            <RoleCard
              letter="I"
              title="Investor"
              description="I'm looking to invest in promising startups."
              bgColor="bg-green-500"
              isSelected={selectedRole === "investor"}
              onClick={() => {
                setSelectedRole("investor");
                setError("");
              }}
              disabled={isPending}
            />
            
            <RoleCard
              letter="J"
              title="Looking to Join"
              description="I want to find exciting startup opportunities."
              bgColor="bg-purple-500"
              isSelected={selectedRole === "job_seeker"}
              onClick={() => {
                setSelectedRole("job_seeker");
                setError("");
              }}
              disabled={isPending}
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-center mb-4 text-sm">{error}</p>
          )}
          
          <button
            onClick={handleContinue}
            disabled={isPending}
            className={`w-full py-3 relative ${isPending ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md transition-colors font-medium text-base`}
          >
            {isPending ? (
              <>
                <span className="opacity-0">Continue</span>
                <Loader2 size={20} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin" />
              </>
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionPage; 