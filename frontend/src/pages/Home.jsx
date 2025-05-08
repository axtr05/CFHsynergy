import { useNavigate, Link, useLocation } from 'react-router-dom';
import { BuildingLibrary, Handshake, LightbulbIcon, Share2, Users } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import NotLoggedIn from '../components/home/NotLoggedIn';
import LoggedInHome from '../components/home/LoggedInHome';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFeature, setActiveFeature] = useState('connections');

  const { data: authUser, isLoading } = useQuery({
    queryKey: ["authUser"],
    queryFn: () => axiosInstance.get('/auth/me').then(res => res.data),
  });

  const features = [
    {
      id: 'connections',
      icon: <Users size={30} className="text-primary" />,
      title: 'Network with professionals',
      description: 'Connect with other professionals in the international development space',
    },
    {
      id: 'opportunities',
      icon: <LightbulbIcon size={30} className="text-primary" />,
      title: 'Find opportunities',
      description: 'Discover job openings, training courses, and other career growth opportunities',
    },
    {
      id: 'collaborate',
      icon: <Handshake size={30} className="text-primary" />,
      title: 'Collaborate on projects',
      description: 'Find potential partners for proposals and projects in the development sector',
    },
    {
      id: 'institutions',
      icon: <BuildingLibrary size={30} className="text-primary" />,
      title: 'Discover institutions',
      description: 'Explore and learn about institutions active in the development space',
    },
    {
      id: 'share',
      icon: <Share2 size={30} className="text-primary" />,
      title: 'Share your expertise',
      description: 'Showcase your experience, skills, and knowledge to potential collaborators',
    },
  ];

  if (isLoading) return <div className="h-[80vh] flex justify-center items-center">Loading...</div>;

  return authUser ? (
    <LoggedInHome />
  ) : (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section with integrated navbar */}
      <div className="relative">
        <div
          style={{
            backgroundImage: "url('/hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            height: "650px"
          }}
          className="w-full"
        >
          {/* Integrated Navbar */}
          <div className="w-full z-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-between items-center py-3">
                {/* Logo */}
                <div className="flex items-center space-x-4">
                  <Link to="/" className="p-1 bg-black/20 rounded-full backdrop-blur-sm">
                    <img className="h-8 rounded" src="/small-logo.png" alt="CFH Synergy" />
                  </Link>
                </div>
                
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                  <Link to="/login" className="px-4 py-2 rounded-lg font-medium text-white hover:bg-white/10 border border-white/30">
                    Sign In
                  </Link>
                  <Link to="/signup" className="px-4 py-2 rounded-lg font-medium bg-white text-blue-600 hover:bg-white/90 shadow-md">
                    Join now
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="flex items-center h-[calc(100%-72px)]">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Connect with professionals in international development
                </h1>
                <p className="text-xl text-white/90 mb-8 max-w-2xl">
                  Join our community to network, collaborate, and find opportunities in the international development space.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => navigate('/signup')}
                    className="btn btn-lg bg-primary hover:bg-primary-focus text-white font-bold px-8 shadow-lg"
                  >
                    Join now
                  </button>
                  <button onClick={() => navigate('/login')} className="btn btn-lg btn-outline text-white border-white hover:bg-white/20 hover:border-transparent">
                    Sign in
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="w-full">
            <path
              fill="#ffffff"
              fillOpacity="1"
              d="M0,64L120,80C240,96,480,128,720,128C960,128,1200,96,1320,80L1440,64L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z"
            ></path>
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What you can do on CFH Synergy</h2>

          <div className="grid md:grid-cols-3 gap-10 mb-12">
            {features.map((feature) => (
              <div
                key={feature.id}
                className={`p-6 rounded-xl transition-all duration-300 cursor-pointer hover:shadow-md ${activeFeature === feature.id ? 'bg-primary/5 border border-primary/10' : 'bg-gray-50'}`}
                onClick={() => setActiveFeature(feature.id)}
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button onClick={() => navigate('/signup')} className="btn btn-primary btn-lg px-8">
              Get Started
            </button>
          </div>
        </div>
      </div>

      <NotLoggedIn />
    </div>
  );
};

export default Home; 