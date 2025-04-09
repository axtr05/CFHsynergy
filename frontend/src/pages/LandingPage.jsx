import { Link } from "react-router-dom";
import { ArrowRight, Users, Briefcase, HandshakeIcon, Award, Search, Zap } from "lucide-react";
import Footer from "../components/layout/Footer";

const LandingPage = () => {
  return (
    <div className="w-full">
      <div className="bg-gradient-to-b from-gray-50 to-white w-full">
        {/* Hero Section */}
        <section className="pt-16 pb-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
                Connect, Collaborate, and Build Amazing Projects
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-xl">
                Join a community of founders, developers, designers, and investors to bring
                your ideas to life through meaningful collaboration.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/signup"
                  className="btn btn-primary text-white text-lg py-3 px-8 rounded-lg font-medium"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="btn btn-outline text-primary text-lg py-3 px-8 rounded-lg font-medium"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src="/collaboration.svg"
                alt="Team collaboration"
                className="w-full max-w-lg"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-gray-50 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Join CFH Synergy?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Our platform provides everything you need to find collaborators and
                bring your projects to life.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="bg-primary-50 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Find Team Members</h3>
                <p className="text-gray-600">
                  Connect with skilled professionals who share your vision and can
                  help bring your project to the next level.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="bg-blue-50 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <Briefcase className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Showcase Projects</h3>
                <p className="text-gray-600">
                  Display your work in a professional format to attract
                  collaborators, investors, and early adopters.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="bg-green-50 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Expand Your Network</h3>
                <p className="text-gray-600">
                  Build meaningful professional relationships with talented
                  individuals across various domains and industries.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How CFH Synergy Works
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Our platform makes it easy to collaborate on projects and connect with like-minded individuals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-indigo-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">1. Discover</h3>
                <p className="text-gray-600">
                  Browse through projects and find opportunities that match your skills and interests.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-indigo-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Connect</h3>
                <p className="text-gray-600">
                  Apply for roles or create your own project to attract collaborators with the right skills.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-indigo-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Build Together</h3>
                <p className="text-gray-600">
                  Collaborate effectively and turn your ideas into reality with a skilled team.
                </p>
              </div>
            </div>
          </div>
        </section>

        
      </div>
      <Footer />
    </div>
  );
};

export default LandingPage; 