import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import ProfileModal from '../components/ProfileModal';
import { Moon, Sun, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ChatPage = ({ darkMode, setDarkMode }) => {
    const { logout, user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showProfile, setShowProfile] = useState(false);

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-slate-900 overflow-hidden">
            {/* Sidebar */}
            <div className={`${isSidebarOpen ? 'w-full md:w-80' : 'w-0'} transition-all duration-300 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col`}>
                <Sidebar />
                
                {/* User Profile / Logout Bottom Bar in Sidebar */}
                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => setShowProfile(true)}>
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold overflow-hidden">
                            {user.profilePicture ? (
                                <img src={user.profilePicture} alt="Me" className="w-full h-full object-cover" />
                            ) : (
                                user.name[0]
                            )}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate dark:text-white">{user.name}</p>
                            <p className="text-xs text-green-500 truncate font-medium">Online</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button 
                            onClick={logout}
                            className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
                <ChatWindow />
            </div>

            <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
        </div>
    );
};

export default ChatPage;
