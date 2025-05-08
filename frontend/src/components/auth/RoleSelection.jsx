import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

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
      className={`relative px-4 py-4 border rounded-lg ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} transition-all ${
        isSelected 
          ? "border-blue-600 bg-blue-50" 
          : "border-gray-200 hover:border-blue-300"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      {isSelected && (
        <div className="absolute right-2 top-2">
          <CheckCircle size={18} className="fill-blue-600 text-white" />
        </div>
      )}
      
      <div className="flex items-center">
        <div className={`${bgColor} w-12 h-12 rounded-full flex items-center justify-center mr-3 flex-shrink-0`}>
          <span className="text-xl font-bold text-white">{letter}</span>
        </div>
        
        <div>
          <h3 className="text-base font-medium mb-1">{title}</h3>
          <p className="text-gray-600 text-sm leading-tight">{description}</p>
        </div>
      </div>
    </div>
  );
};

const RoleSelection = ({ selectedRole, setSelectedRole, onContinue, isLoading }) => {
  const [error, setError] = useState("");
  
  const handleContinue = () => {
    if (!selectedRole) {
      setError("Please select a role to continue");
      return;
    }
    
    onContinue();
  };
  
  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-center mb-1">
          What brings you to CFHsynergy?
        </h3>
        
        <p className="text-gray-600 text-center text-sm mb-5">
          Select the option that best describes you. This helps us personalize your experience.
        </p>
        
        <div className="flex flex-col space-y-3 mb-6">
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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
          />
        </div>
        
        {error && (
          <p className="text-red-500 text-center mb-4">{error}</p>
        )}
        
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={isLoading}
            className={`w-full py-2 relative ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md transition-colors`}
          >
            {isLoading ? (
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

export default RoleSelection; 