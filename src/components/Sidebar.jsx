import React, { useState, useEffect } from 'react';
import { Search, UserMinus } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API from '../services/api';
import { toast } from 'react-hot-toast';

const Sidebar = () => {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const { setSelectedChat, chats, setChats, onlineUsers } = useChat();
    const { user } = useAuth();
    const socket = useSocket();

    const fetchChats = async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/messages/chats');
            setChats(data);
        } catch (error) {
            console.error('Failed to fetch chats', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFriends = async () => {
        try {
            const { data } = await API.get('/users/friends');
            setFriends(data);
        } catch (error) {
            console.error('Failed to fetch friends', error);
        }
    };

    const fetchRequests = async () => {
        try {
            const { data } = await API.get('/users/requests');
            setRequests(data);
        } catch (error) {
            console.error('Failed to fetch requests', error);
        }
    };

    useEffect(() => {
        fetchChats();
        fetchFriends();
        fetchRequests();
    }, [setChats]);

    const handleSearch = async (query) => {
        setSearch(query);
        if (!query) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const { data } = await API.get(`/users?search=${query}`);
            setSearchResults(data);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (userId) => {
        try {
            await API.post(`/users/requests/send/${userId}`);
            toast.success('Friend request sent!');
            // Real-time notification to the target user
            if (socket) {
                socket.emit('friend request sent', { toUserId: userId, fromUser: { _id: user._id, name: user.name } });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send request');
        }
    };

    const handleRespondToRequest = async (requestId, status) => {
        try {
            await API.post(`/users/requests/respond/${requestId}`, { status });
            toast.success(`Request ${status}`);
            fetchRequests();
            if (status === 'accepted') fetchFriends();
        } catch (error) {
            toast.error('Failed to respond to request');
        }
    };

    const handleRemoveFriend = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this friend?')) return;
        try {
            await API.delete(`/users/friends/${userId}`);
            toast.success('Friend removed');
            fetchFriends(); // Refresh friends list
        } catch (error) {
            toast.error('Failed to remove friend');
        }
    };

    const accessChat = (user) => {
        setSelectedChat({ _id: user._id, name: user.name, type: '1to1' });
        setSearch('');
        setSearchResults([]);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold dark:text-white">Messages</h1>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by ID or Name..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white text-sm"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {search ? (
                    <div className="p-2 space-y-1">
                        {searchResults.map((user) => (
                            <div
                                key={user._id}
                                className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors group"
                            >
                                <div className="flex items-center space-x-3 cursor-pointer flex-1" onClick={() => accessChat(user)}>
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold overflow-hidden">
                                            {user.profilePicture ? (
                                                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                user.name[0]
                                            )}
                                        </div>
                                        {onlineUsers.includes(user._id) && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <p className="text-sm font-semibold dark:text-white">{user.name}</p>
                                            <span className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 px-1.5 py-0.5 rounded-md font-mono">#{user.uniqueChatID}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                                    </div>
                                </div>
                                {friends.find(f => f._id === user._id) ? (
                                    <button 
                                        onClick={() => handleRemoveFriend(user._id)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-xs font-bold flex items-center space-x-1"
                                    >
                                        <UserMinus size={14} />
                                        <span>Remove</span>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleSendRequest(user._id)}
                                        className="p-2 bg-[#128c7e] hover:bg-[#075e54] text-white rounded-lg transition-all text-xs font-bold"
                                    >
                                        Send Request
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-2">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Recent Chats</div>
                        {chats.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                No conversations yet. Search for a user to start chatting!
                            </div>
                        ) : (
                            chats.map((chat) => (
                                <button
                                    key={chat._id}
                                    onClick={() => setSelectedChat({ ...chat, type: '1to1', name: chat.name })}
                                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-left"
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-[#128c7e] flex items-center justify-center text-white font-bold overflow-hidden">
                                            {chat.profilePicture ? (
                                                <img src={chat.profilePicture} alt="Chat" className="w-full h-full object-cover" />
                                            ) : (
                                                chat.name?.[0] || 'U'
                                            )}
                                        </div>
                                        {onlineUsers.includes(chat._id) && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-semibold dark:text-white truncate">{chat.name}</p>
                                            {chat.unreadCount > 0 && (
                                                <span className="bg-[#25d366] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                    {chat.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chat.latestMessage?.content || 'No messages yet'}</p>
                                    </div>
                                </button>
                            ))
                        )}

                        {/* Friends Section */}
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mt-6 mb-2">My Friends</div>
                        {friends.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                No friends added yet. Search by ID to add friends!
                            </div>
                        ) : (
                            friends
                                .filter(u => !chats.find(c => c._id === u._id)) // Hide friends already in recent chats
                                .map((u) => (
                                    <div
                                        key={u._id}
                                        className="w-full flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-left group"
                                    >
                                        <div className="relative cursor-pointer" onClick={() => accessChat(u)}>
                                            <div className="w-10 h-10 rounded-full bg-[#128c7e]/10 dark:bg-[#25d366]/10 flex items-center justify-center text-[#128c7e] font-bold overflow-hidden">
                                                {u.profilePicture ? (
                                                    <img src={u.profilePicture} alt={u.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    u.name?.[0] || 'U'
                                                )}
                                            </div>
                                            {onlineUsers.includes(u._id) && (
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden cursor-pointer" onClick={() => accessChat(u)}>
                                            <div className="flex items-center space-x-2">
                                                <p className="text-sm font-semibold dark:text-white truncate">{u.name}</p>
                                                <span className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-400 px-1.5 py-0.5 rounded-md font-mono">#{u.uniqueChatID}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Tap to start chatting</p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveFriend(u._id);
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                            title="Remove Friend"
                                        >
                                            <UserMinus size={18} />
                                        </button>
                                    </div>
                                ))
                        )}

                        {/* Friend Requests Section */}
                        {requests.length > 0 && (
                            <>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mt-6 mb-2 flex items-center justify-between">
                                    <span>Friend Requests</span>
                                    <span className="bg-primary-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{requests.length}</span>
                                </div>
                                {requests.map((req) => (
                                    <div key={req._id} className="p-3 bg-primary-50/50 dark:bg-primary-900/10 rounded-xl mb-1 mx-2">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-bold overflow-hidden text-xs">
                                                {req.from.profilePicture ? (
                                                    <img src={req.from.profilePicture} alt={req.from.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    req.from.name[0]
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold dark:text-white truncate">{req.from.name}</p>
                                                <p className="text-[10px] text-gray-500 truncate">#{req.from.uniqueChatID}</p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 text-xs">
                                            <button 
                                                onClick={() => handleRespondToRequest(req._id, 'accepted')}
                                                className="flex-1 py-1.5 bg-[#128c7e] text-white rounded-lg font-bold"
                                            >
                                                Accept
                                            </button>
                                            <button 
                                                onClick={() => handleRespondToRequest(req._id, 'rejected')}
                                                className="flex-1 py-1.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
};

export default Sidebar;
