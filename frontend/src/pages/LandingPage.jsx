import { Link } from "react-router-dom";
import { ArrowRight, Users, Briefcase, HandshakeIcon, Award, Search, Zap } from "lucide-react";
import Footer from "../components/layout/Footer";

const LandingPage = () => {
  return (
    <div className="w-full overflow-x-hidden">
      {/* Hero Section with Background Image */}
      <div className="relative w-full h-screen flex items-center">
        {/* Background Image with enhanced styling */}
        <div 
          className="absolute top-0 left-0 right-0 w-full bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: "url('/hero2.jpg')",
            backgroundSize: "cover",
            height: "100%",
            zIndex: 0,
            filter: "brightness(0.75) contrast(1.1)"
          }}
        ></div>
        
        {/* Enhanced overlay for better text contrast and modern look */}
        <div 
          className="absolute top-0 left-0 right-0 w-full"
          style={{ 
            height: "100%",
            zIndex: 1,
            background: "linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.2) 100%)",
            backdropFilter: "blur(1px)"
          }}
        ></div>
        
        {/* Integrated Navbar with enhanced styling */}
        <div className="absolute top-0 left-0 w-full z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              {/* Logo with enhanced styling */}
              <div className="flex items-center">
                <Link to="/" className="p-1.5 bg-white/20 rounded-full transition-all duration-300 hover:bg-white/30">
                  <img className="h-9 rounded" src="/small-logo.png" alt="CFH Synergy" />
                </Link>
              </div>
              
              {/* Navigation with enhanced styling */}
              <div className="hidden md:flex items-center gap-6">
                <Link to="/login" className="px-5 py-2.5 rounded-lg font-medium text-white hover:bg-white/20 border border-white/40 transition-all duration-300">
                  Sign In
                </Link>
                <Link to="/signup" className="px-5 py-2.5 rounded-lg font-medium bg-white/90 text-blue-600 hover:bg-white shadow-md transition-all duration-300">
                  Join now
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Hero Content with enhanced styling */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="max-w-2xl">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-tight mb-6 drop-shadow-md">
              Forge Connections,<br />Build Legacy
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-xl font-light leading-relaxed tracking-wide" style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.4)" }}>
              Where visionaries and professionals unite to transform international 
              development through <span className="italic font-normal">timeless collaboration</span> and <span className="font-medium">meaningful impact</span>.
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <Link
                to="/signup"
                className="group relative inline-flex h-14 w-64 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-blue-500/80 to-indigo-600/80 text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 border border-white/25"
              >
                <span className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-all duration-300"></span>
                <span className="absolute left-0 -ml-2 h-48 w-48 origin-top-right -translate-x-full translate-y-12 -rotate-90 bg-white opacity-10 transition-all duration-1000 group-hover:-rotate-180"></span>
                <span className="relative flex items-center justify-center font-semibold tracking-wide">
                  Begin Your Journey
                  <ArrowRight className="ml-2 h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative element */}
        <div className="absolute bottom-10 right-10 z-10 hidden lg:block">
          <div className="w-24 h-24 border-2 border-white/30 rounded-full"></div>
        </div>
      </div>

      {/* Features Section - with white background to cover the hero background image */}
      <div className="relative z-20">
        <section className="py-20 bg-white w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Why Join CFH Synergy?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our platform provides everything you need to find collaborators and
                bring your projects to life.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="bg-primary-50 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Find Team Members</h3>
                <p className="text-gray-600 text-lg">
                  Connect with skilled professionals who share your vision and can
                  help bring your project to the next level.
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="bg-blue-50 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                  <Briefcase className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Showcase Projects</h3>
                <p className="text-gray-600 text-lg">
                  Display your work in a professional format to attract
                  collaborators, investors, and early adopters.
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="bg-green-50 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-3">Expand Your Network</h3>
                <p className="text-gray-600 text-lg">
                  Build meaningful professional relationships with talented
                  individuals across various domains and industries.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-gray-50 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                How CFH Synergy Works
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our platform makes it easy to collaborate on projects and connect with like-minded individuals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="bg-indigo-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                  <Search className="h-10 w-10 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">1. Discover</h3>
                <p className="text-gray-600 text-lg">
                  Browse through projects and find opportunities that match your skills and interests.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-indigo-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                  <Zap className="h-10 w-10 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">2. Connect</h3>
                <p className="text-gray-600 text-lg">
                  Apply for roles or create your own project to attract collaborators with the right skills.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-indigo-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-3">3. Build Together</h3>
                <p className="text-gray-600 text-lg">
                  Collaborate effectively and turn your ideas into reality with a skilled team.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage; 