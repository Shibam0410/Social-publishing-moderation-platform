import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost, getCommunities } from '../services/api';
import { Image, AlignLeft, CalendarClock } from 'lucide-react';

export default function CreatePost() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('text');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [communityId, setCommunityId] = useState('');
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  // Image state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    getCommunities().then(data => setCommunities(data.communities || [])).catch(console.error);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const isFormValid = () => {
    if (postType === 'image') return !!imageFile;
    if (postType === 'poll') return pollOptions.filter(o => o.trim()).length >= 2;
    return !!content.trim();
  };

  const handleSubmit = async (e, type = 'PUBLISHED') => {
    e.preventDefault();
    if (!isFormValid()) return;
    setLoading(true);
    setError(null);
    try {
      const finalType = isScheduling ? 'scheduled' : postType;
      // For image posts, store base64 data URI so it can be displayed in the feed
      const finalContent = postType === 'image'
        ? JSON.stringify({ caption: content.trim(), imageData: imagePreview })
        : content;
      await createPost(finalContent, finalType, communityId || null, null, postType === 'poll' ? pollOptions.filter(o => o.trim()) : [], isScheduling ? new Date(scheduledDate).toISOString() : null);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Create New Post</h1>
      
      <div className="card bg-white">
        {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Post To</label>
            <select 
              value={communityId} 
              onChange={(e) => setCommunityId(e.target.value)}
              className="input bg-slate-50 border-slate-200"
            >
              <option value="">My Profile (Public)</option>
              {communities.map(c => (
                <option key={c.id} value={c.id}>c/{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Post Type</label>
            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={() => { setPostType('text'); setImageFile(null); setImagePreview(''); }}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${postType === 'text' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                <AlignLeft className="h-4 w-4 mr-2" /> Text
              </button>
              <button 
                type="button"
                onClick={() => { setPostType('image'); }}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${postType === 'image' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                <Image className="h-4 w-4 mr-2" /> Image
              </button>
              <button 
                type="button"
                onClick={() => { setPostType('poll'); setImageFile(null); setImagePreview(''); }}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${postType === 'poll' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                <AlignLeft className="h-4 w-4 mr-2" /> Poll
              </button>
            </div>
          </div>

          {/* Main content textarea — shown for text, poll (as question), and image (as caption) */}
          <div>
            <textarea
              rows={postType === 'poll' ? 2 : 6}
              placeholder={postType === 'poll' ? 'Ask a question… (optional)' : postType === 'image' ? 'Add a caption… (optional)' : "What's on your mind?"}
              className="input bg-slate-50 border-slate-200 resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Image upload */}
          {postType === 'image' && (
            <div>
              <label
                htmlFor="image-upload"
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-50 cursor-pointer hover:border-primary/50 hover:bg-blue-50/30 transition-colors"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg object-contain mb-2" />
                ) : (
                  <>
                    <Image className="h-8 w-8 mb-2 text-slate-400" />
                    <p className="text-sm">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF (max. 5MB)</p>
                  </>
                )}
                {imageFile && (
                  <p className="text-xs text-primary mt-2 font-medium">{imageFile.name}</p>
                )}
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          )}

          {/* Poll options */}
          {postType === 'poll' && (
            <div className="space-y-2 mt-4">
              <label className="block text-sm font-medium text-slate-700">Poll Options <span className="text-red-500">*</span></label>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder={`Option ${i + 1}${i < 2 ? ' (required)' : ''}`}
                    className="input py-2 px-3 bg-white border-slate-200 flex-1"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[i] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-50">
                      ✗
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-sm text-primary font-medium mt-2 hover:underline">
                  + Add Option
                </button>
              )}
              {pollOptions.filter(o => o.trim()).length < 2 && (
                <p className="text-xs text-amber-600 mt-1">At least 2 options are required.</p>
              )}
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 border-t border-slate-100">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button 
                type="button" 
                onClick={() => setIsScheduling(!isScheduling)}
                className={`btn flex items-center ${isScheduling ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100'}`}
              >
                <CalendarClock className="h-4 w-4 mr-2" /> Schedule
              </button>
              
              {isScheduling && (
                <input 
                  type="datetime-local" 
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="input py-2 text-sm max-w-xs"
                />
              )}
            </div>
            
            <div className="flex space-x-3 w-full sm:w-auto justify-end">
              <button 
                type="button" 
                onClick={(e) => handleSubmit(e, 'DRAFT')}
                disabled={loading || !isFormValid() || (isScheduling && !scheduledDate)}
                className="btn bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                Save Draft
              </button>
              
              <button 
                type="button" 
                onClick={(e) => handleSubmit(e, 'PUBLISHED')}
                disabled={loading || !isFormValid() || (isScheduling && !scheduledDate)}
                className="btn disabled:opacity-50"
              >
                {loading ? 'Processing...' : isScheduling ? 'Schedule Post' : 'Publish'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}