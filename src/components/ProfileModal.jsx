import React, { useState, useRef } from 'react';
import { X, Camera, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import toast from 'react-hot-toast';

const ProfileModal = ({ isOpen, onClose }) => {
    const { user, updateUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(user?.profilePicture || '');
    const fileInputRef = useRef();

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview locally
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload to server/Cloudinary
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await API.post('/messages/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            // Just update the preview with the real URL
            setImagePreview(data.url);
            toast.success('Image uploaded');
        } catch (error) {
            toast.error('Failed to upload image');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { data } = await API.put('/users/profile', {
                name,
                profilePicture: imagePreview
            });
            updateUser(data);
            toast.success('Profile updated');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold dark:text-white">Your Profile</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-500"><X /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-500/20 bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-primary-500 text-3xl font-bold">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user?.name[0]
                                )}
                            </div>
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current.click()}
                                className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors"
                            >
                                <Camera size={16} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Click the camera to upload a new photo</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (Read-only)</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800 border-none rounded-xl text-gray-500 cursor-not-allowed text-sm"
                                value={user?.email}
                                disabled
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Unique Chat ID</label>
                            <div className="flex items-center space-x-2">
                                <div className="flex-1 px-4 py-2 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 rounded-xl text-primary-700 dark:text-primary-400 font-bold font-mono text-center tracking-widest">
                                    #{user?.uniqueChatID}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(user?.uniqueChatID);
                                        toast.success('ID copied to clipboard!');
                                    }}
                                    className="p-2 bg-gray-100 dark:bg-slate-700 text-gray-500 hover:text-primary-500 rounded-xl"
                                    title="Copy ID"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                            </div>
                            <p className="mt-1 text-[10px] text-gray-400">Share this ID with friends to let them find you easily!</p>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/20 hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            <span>Save Changes</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
