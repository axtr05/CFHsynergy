import { useState, useRef, useEffect } from 'react';
import { X, Image, Video, FileText, BarChart3, Smile, Plus } from 'lucide-react';
import { axiosInstance } from '../lib/axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const CreatePostModal = ({ isOpen, onClose, user, initialMediaType = null }) => {
  const [postContent, setPostContent] = useState('');
  const [mediaType, setMediaType] = useState(null); // 'photo', 'video', 'poll', 'document'
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState([]);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { mutate: createPost, isLoading } = useMutation({
    mutationFn: async (data) => {
      const formData = new FormData();
      
      // Ensure content field is properly set
      if (data.content) {
        formData.append('content', data.content);
      }
      
      if (data.mediaType) {
        if (data.mediaType === 'photo' && data.mediaFiles && data.mediaFiles.length > 0) {
          // For photo uploads, use 'images' field as expected by the backend
          data.mediaFiles.forEach(file => {
            formData.append('images', file);
          });
        } 
        else if (data.mediaType === 'video' && data.mediaFiles && data.mediaFiles.length > 0) {
          // For video uploads - handle as needed
          data.mediaFiles.forEach(file => {
            formData.append('video', file);
          });
        }
        else if (data.mediaType === 'poll') {
          // For polls
          formData.append('pollOptions', JSON.stringify(data.pollOptions));
        }
        else if (data.mediaType === 'document' && data.mediaFiles && data.mediaFiles.length > 0) {
          // For document uploads
          data.mediaFiles.forEach(file => {
            formData.append('documents', file);
          });
        }
      }
      
      // Log form data for debugging
      console.log('Sending post with content:', data.content);
      
      // Make request to server
      const response = await axiosInstance.post('/posts/create', formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      console.log('Post created response:', response.data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Post created successfully');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create post');
    },
  });

  const resetForm = () => {
    setPostContent('');
    setMediaType(null);
    setMediaFiles([]);
    setMediaPreviewUrls([]);
    setPollOptions(['', '']);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedContent = postContent.trim();
    
    // Check if there's valid content to post
    if (!trimmedContent && !mediaFiles.length && mediaType !== 'poll') {
      return;
    }
    
    // For text-only posts with no media
    if (!mediaType) {
      createPost({ 
        content: trimmedContent
      });
      return;
    }
    
    // Validate poll options if it's a poll
    if (mediaType === 'poll') {
      const validOptions = pollOptions.filter(option => option.trim() !== '');
      if (validOptions.length < 2) {
        toast.error('Please provide at least 2 poll options');
        return;
      }
      
      createPost({ 
        content: trimmedContent, 
        mediaType, 
        pollOptions: validOptions 
      });
    } else {
      createPost({ 
        content: trimmedContent, 
        mediaType, 
        mediaFiles
      });
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Limit to 10 files
    const newFiles = [...mediaFiles, ...files].slice(0, 10);
    setMediaFiles(newFiles);
    
    // Create preview URLs for new files
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setMediaPreviewUrls([...mediaPreviewUrls, ...newPreviews].slice(0, 10));
  };
  
  const handleMediaTypeSelect = (type) => {
    if (mediaType === type) {
      // Clicking the same button toggles it off
      setMediaType(null);
      setMediaFiles([]);
      setMediaPreviewUrls([]);
      setPollOptions(['', '']);
    } else {
      setMediaType(type);
      if (type === 'photo' || type === 'video' || type === 'document') {
        setTimeout(() => fileInputRef.current?.click(), 100);
      }
    }
  };
  
  const handleRemoveMedia = (index) => {
    URL.revokeObjectURL(mediaPreviewUrls[index]);
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, '']);
    }
  };
  
  const handleRemovePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };
  
  const handlePollOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  // Set initial media type when modal opens
  useEffect(() => {
    if (isOpen && initialMediaType) {
      setMediaType(initialMediaType);
      // Auto-open file picker for media types that need files
      if ((initialMediaType === 'photo' || initialMediaType === 'video' || initialMediaType === 'document') && fileInputRef.current) {
        setTimeout(() => fileInputRef.current?.click(), 200);
      }
    }
  }, [isOpen, initialMediaType]);

  // Focus the textarea when the modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // Clean up object URLs when the component unmounts
  useEffect(() => {
    return () => {
      mediaPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [mediaPreviewUrls]);

  if (!isOpen) return null;
  
  const getAcceptedFileTypes = () => {
    switch (mediaType) {
      case 'photo':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'document':
        return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900">Create post</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={user?.profilePicture || "/avatar.png"} 
              alt={user?.name} 
              className="w-12 h-12 rounded-full object-cover border border-gray-200"
            />
            <div>
              <h3 className="font-semibold text-gray-900">{user?.name}</h3>
              <p className="text-sm text-gray-500">Post to Everyone</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What do you want to talk about?"
              className="w-full min-h-[140px] text-lg text-gray-800 placeholder-gray-500 bg-transparent border-none focus:ring-0 resize-none"
              required={!mediaFiles.length && mediaType !== 'poll'}
            />
            
            {/* Media previews */}
            {mediaType === 'photo' && mediaPreviewUrls.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Photos</h4>
                <div className="flex flex-wrap gap-2">
                  {mediaPreviewUrls.map((url, index) => (
                    <div key={index} className="relative w-24 h-24 bg-gray-100 rounded-md overflow-hidden">
                      <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="absolute top-1 right-1 bg-gray-800/70 text-white rounded-full p-1 hover:bg-gray-900/70"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {mediaPreviewUrls.length < 10 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md text-gray-400 hover:text-gray-500 hover:border-gray-400"
                    >
                      <Plus size={24} />
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {mediaType === 'video' && mediaPreviewUrls.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Video</h4>
                <div className="relative rounded-md overflow-hidden bg-gray-100">
                  <video 
                    src={mediaPreviewUrls[0]} 
                    className="w-full max-h-[240px]" 
                    controls
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(0)}
                    className="absolute top-2 right-2 bg-gray-800/70 text-white rounded-full p-1 hover:bg-gray-900/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
            
            {mediaType === 'document' && mediaFiles.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Documents</h4>
                <div className="flex flex-col gap-2">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-gray-500" />
                        <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="text-gray-500 hover:text-gray-700 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {mediaFiles.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-600 hover:border-gray-400"
                    >
                      <Plus size={18} />
                      <span>Add another file</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {mediaType === 'poll' && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Poll Options</h4>
                <div className="space-y-2">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handlePollOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required={index < 2}
                      />
                      {index >= 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePollOption(index)}
                          className="text-gray-500 hover:text-gray-700 p-1"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddPollOption}
                      className="flex items-center text-blue-500 gap-1 text-sm mt-2"
                    >
                      <Plus size={16} />
                      <span>Add option</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={getAcceptedFileTypes()}
              onChange={handleFileSelect}
              multiple={mediaType === 'photo' || mediaType === 'document'}
            />
            
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
                <button 
                  type="button" 
                  className={`p-2 ${mediaType === 'photo' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} rounded-full transition-colors`}
                  title="Add a photo"
                  onClick={() => handleMediaTypeSelect('photo')}
                >
                  <Image size={20} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 ${mediaType === 'video' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} rounded-full transition-colors`}
                  title="Add a video"
                  onClick={() => handleMediaTypeSelect('video')}
                >
                  <Video size={20} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 ${mediaType === 'poll' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} rounded-full transition-colors`}
                  title="Create a poll"
                  onClick={() => handleMediaTypeSelect('poll')}
                >
                  <BarChart3 size={20} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 ${mediaType === 'document' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} rounded-full transition-colors`}
                  title="Add a document"
                  onClick={() => handleMediaTypeSelect('document')}
                >
                  <FileText size={20} />
                </button>
                <button 
                  type="button" 
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title="Add emoji"
                >
                  <Smile size={20} />
                </button>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || (!postContent.trim() && !mediaFiles.length && mediaType !== 'poll')}
                className={`px-4 py-1.5 rounded-full font-medium text-sm ${
                  (postContent.trim() || mediaFiles.length > 0 || mediaType === 'poll') && !isLoading
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                } transition-colors`}
              >
                {isLoading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal; 