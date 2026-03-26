import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Mic, X, Edit2, MessageSquare, Search } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API from '../services/api';
import MessageBubble from './MessageBubble';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';

const ChatWindow = () => {
    const { selectedChat, onlineUsers, setMessages: setGlobalMessages } = useChat();
    const { user } = useAuth();
    const socket = useSocket();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const fileInputRef = useRef();
    const scrollRef = useRef();
    const chatContainerRef = useRef();

    useEffect(() => {
        if (!selectedChat) return;

        const initialFetch = async () => {
            setPage(1);
            setHasMore(true);
            try {
                const endpoint = selectedChat.type === '1to1' 
                    ? `/messages/${selectedChat._id}?page=1` 
                    : `/messages/group/${selectedChat._id}?page=1`;
                const { data } = await API.get(endpoint);
                setMessages(data);
                if (data.length < 20) setHasMore(false);
                
                // Mark as read
                await API.put(`/messages/read/${selectedChat._id}?type=${selectedChat.type}`);
                
                if (socket) {
                    socket.emit('join chat', selectedChat._id);
                }
            } catch (error) {
                console.error('Failed to fetch messages', error);
            }
        };

        initialFetch();
    }, [selectedChat, socket]);

    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore) return;
        
        try {
            setLoadingMore(true);
            const nextPage = page + 1;
            const endpoint = selectedChat.type === '1to1' 
                ? `/messages/${selectedChat._id}?page=${nextPage}` 
                : `/messages/group/${selectedChat._id}?page=${nextPage}`;
            
            const { data } = await API.get(endpoint);
            if (data.length === 0) {
                setHasMore(false);
            } else {
                setMessages(prev => [...data, ...prev]);
                setPage(nextPage);
                if (data.length < 20) setHasMore(false);
            }
        } catch (error) {
            console.error('Failed to load more messages', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleScroll = (e) => {
        if (e.target.scrollTop === 0 && hasMore && !loadingMore) {
            loadMoreMessages();
        }
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('message received', (newMessageReceived) => {
            const incomingChatId = newMessageReceived.chatType === '1to1' ? newMessageReceived.sender._id : newMessageReceived.group._id;
            
            if (selectedChat && selectedChat._id === incomingChatId) {
                setMessages((prev) => [...prev, newMessageReceived]);
                // Mark as read if chat is open
                API.put(`/messages/read/${selectedChat._id}?type=${selectedChat.type}`)
                    .catch(err => console.error('Failed to mark as read', err));
            }
        });

        socket.on('message error', ({ message }) => {
            toast.error(message || 'Cannot send message');
        });

        socket.on('typing', (data) => {
            if (data.senderId !== user._id && (data.room === selectedChat._id || data.senderId === selectedChat._id)) {
                setIsTyping(true);
            }
        });
        socket.on('stop typing', (data) => {
            if (data.senderId !== user._id && (data.room === selectedChat._id || data.senderId === selectedChat._id)) {
                setIsTyping(false);
            }
        });

        socket.on('message edited', (updatedMessage) => {
            setMessages((prev) => prev.map(m => m._id === updatedMessage._id ? updatedMessage : m));
        });

        socket.on('message deleted', (data) => {
            setMessages((prev) => prev.filter(m => m._id !== data.messageId));
        });

        return () => {
            socket.off('message received');
            socket.off('message error');
            socket.off('typing');
            socket.off('stop typing');
            socket.off('message edited');
            socket.off('message deleted');
        };
    }, [socket, selectedChat, user._id]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const [editingMessage, setEditingMessage] = useState(null);

    const handleDelete = async (messageId) => {
        try {
            await API.delete(`/messages/m/${messageId}`);
            if (socket) {
                socket.emit('message deleted', { 
                    messageId, 
                    chatId: selectedChat._id, 
                    chatType: selectedChat.type 
                });
            }
            setMessages(messages.filter(m => m._id !== messageId));
            toast.success('Message deleted');
        } catch (error) {
            toast.error('Failed to delete message');
        }
    };

    const handleEdit = (message) => {
        setEditingMessage(message);
        setNewMessage(message.content);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || !socket) return;

        if (editingMessage) {
            try {
                const { data } = await API.put(`/messages/m/${editingMessage._id}`, { content: newMessage });
                const updatedMsg = { 
                    ...editingMessage, 
                    content: data.content,
                    receiver: selectedChat.type === '1to1' ? selectedChat._id : undefined,
                    group: selectedChat.type === 'group' ? selectedChat._id : undefined,
                    chatType: selectedChat.type
                };
                
                if (socket) socket.emit('message edited', updatedMsg);
                
                setMessages(messages.map(m => m._id === editingMessage._id ? updatedMsg : m));
                setEditingMessage(null);
                setNewMessage('');
                toast.success('Message updated');
                return;
            } catch (error) {
                toast.error('Failed to update message');
                return;
            }
        }

        let mediaFileData = null;
        if (selectedFile) {
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', selectedFile);
                const { data } = await API.post('/messages/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                mediaFileData = data;
            } catch (error) {
                toast.error('Failed to upload file');
                setUploading(false);
                return;
            } finally {
                setUploading(false);
            }
        }

        socket.emit('stop typing', selectedChat._id);
        const messageData = {
            sender: user._id,
            content: newMessage,
            mediaFile: mediaFileData,
            chatType: selectedChat.type,
            [selectedChat.type === '1to1' ? 'receiver' : 'group']: selectedChat._id,
        };

        try {
            socket.emit('new message', messageData);
            const tempMessage = {
                ...messageData,
                _id: Date.now().toString(),
                sender: { _id: user._id, name: user.name },
                createdAt: new Date().toISOString()
            };
            setMessages([...messages, tempMessage]);
            setNewMessage('');
            setSelectedFile(null);
        } catch (error) {
            console.error('Error sending message', error);
        }
    };

    const typingHandler = (e) => {
        setNewMessage(e.target.value);

        if (!socket) return;

        if (!isTyping) {
            socket.emit('typing', selectedChat._id);
        }

        let lastTypingTime = new Date().getTime();
        let timerLength = 3000;
        setTimeout(() => {
            let timeNow = new Date().getTime();
            let timeDiff = timeNow - lastTypingTime;
            if (timeDiff >= timerLength) {
                socket.emit('stop typing', selectedChat._id);
            }
        }, timerLength);
    };

    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);
            
            let chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                // For a full app, upload total to server/Cloudinary here
                // For demo, we'll just show it
                sendVoiceMessage(audioUrl);
                setAudioChunks([]);
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            toast.error('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    };

    const sendVoiceMessage = async (blobUrl) => {
        if (!socket) return;
        
        try {
            setUploading(true);
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            const file = new File([blob], "voice_note.webm", { type: 'audio/webm' });
            
            const formData = new FormData();
            formData.append('file', file);
            
            const { data: mediaData } = await API.post('/messages/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const messageData = {
                sender: user._id,
                content: "Voice Message",
                mediaFile: mediaData,
                chatType: selectedChat.type,
                [selectedChat.type === '1to1' ? 'receiver' : 'group']: selectedChat._id,
            };
            
            socket.emit('new message', messageData);
            setMessages([...messages, { ...messageData, _id: Date.now().toString(), sender: user, createdAt: new Date().toISOString() }]);
        } catch (error) {
            toast.error('Failed to send voice message');
        } finally {
            setUploading(false);
        }
    };

    if (!selectedChat) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center text-gray-500 dark:text-gray-400">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-lg mb-4">
                    <MessageSquare size={48} className="text-primary-500" />
                </div>
                <h2 className="text-xl font-bold">Your Messages</h2>
                <p>Select a contact or group to start chatting</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#128c7e] flex items-center justify-center text-white font-bold border-2 border-white/10">
                        {selectedChat.profilePicture ? (
                            <img src={selectedChat.profilePicture} alt={selectedChat.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            selectedChat.name?.[0] || 'U'
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold dark:text-white leading-tight">{selectedChat.name || 'Chat'}</h3>
                        <p className="text-[11px] font-medium flex items-center">
                            {isTyping ? (
                                <span className="text-[#128c7e] dark:text-[#25d366] flex items-center space-x-1">
                                    <span>typing</span>
                                    <span className="typing-dots"><span></span><span></span><span></span></span>
                                </span>
                            ) : (
                                onlineUsers.includes(selectedChat._id) ? (
                                    <span className="text-[#128c7e] dark:text-[#25d366]">online</span>
                                ) : (
                                    <span className="text-gray-400">
                                        {selectedChat.lastSeen ? `last seen today at ${new Date(selectedChat.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'offline'}
                                    </span>
                                )
                            )}
                        </p>
                    </div>
                </div>
                {showSearch && (
                    <div className="flex-1 mx-4 max-w-sm relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search in chat..."
                            className="w-full pl-10 pr-4 py-1.5 bg-gray-100 dark:bg-slate-700 border-none rounded-lg focus:ring-1 focus:ring-primary-500 dark:text-white text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}
                <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
                    <button onClick={() => setShowSearch(!showSearch)} className="hover:text-primary-500 transition-colors" title="Search in chat"><Search size={20} /></button>
                    <button className="hover:text-primary-500 transition-colors" title="Audio Call"><Phone size={20} /></button>
                    <button className="hover:text-primary-500 transition-colors" title="Video Call"><Video size={20} /></button>
                </div>
            </div>

            {/* Messages Area */}
            <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5] dark:bg-[#0b141a] relative"
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 chat-bg-whatsapp pointer-events-none"></div>
                {loadingMore && (
                    <div className="flex justify-center p-2">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {messages
                    .filter(m => m.content.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((m) => (
                        <MessageBubble 
                            key={m._id} 
                            message={m} 
                            isOwn={m.sender._id === user._id || m.sender === user._id} 
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                        />
                    ))
                }
                {uploading && (
                    <div className="flex justify-end">
                        <div className="bg-primary-50 px-4 py-2 rounded-2xl shadow-sm text-xs text-primary-600 animate-pulse">
                            Uploading file...
                        </div>
                    </div>
                )}
                {isTyping && (
                    <div className="flex justify-start mb-2">
                        <div className="bg-white dark:bg-[#202c33] px-3 py-1.5 rounded-2xl rounded-bl-none shadow-sm text-sm text-[#128c7e] dark:text-[#25d366] flex items-center space-x-1">
                            <span>typing</span>
                            <span className="typing-dots"><span></span><span></span><span></span></span>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>


            {/* Editing Indicator */}
            {editingMessage && (
                <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border-t border-primary-100 dark:border-primary-800 flex items-center justify-between text-xs text-primary-700 dark:text-primary-300">
                    <p className="flex items-center space-x-2">
                        <Edit2 size={12} /> <span>Editing message...</span>
                    </p>
                    <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="hover:text-red-500">Cancel</button>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex flex-col space-y-2">
                {selectedFile && (
                    <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center space-x-2 overflow-hidden">
                            <Paperclip size={16} className="text-gray-500" />
                            <span className="text-xs truncate">{selectedFile.name}</span>
                        </div>
                        <button type="button" onClick={() => setSelectedFile(null)} className="text-red-500 hover:bg-red-50 p-1 rounded-full"><X size={14} /></button>
                    </div>
                )}
                <div className="flex items-center space-x-3">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current.click()}
                        className="p-2 text-gray-500 hover:text-primary-500 dark:text-gray-400"
                    >
                        <Paperclip size={22} />
                    </button>
                    <div className="flex-1 relative">
                        {isRecording ? (
                            <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl animate-pulse">
                                <span className="flex items-center space-x-2"><Mic size={16} /> <span>Recording...</span></span>
                                <button type="button" onClick={stopRecording} className="font-bold underline">Stop</button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-none rounded-2xl focus:ring-2 focus:ring-primary-500 dark:text-white text-sm"
                                    value={newMessage}
                                    onChange={typingHandler}
                                    onFocus={() => setShowEmojiPicker(false)}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="text-gray-500 hover:text-primary-500 dark:text-gray-400"
                                    >
                                        <Smile size={20} />
                                    </button>
                                </div>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-16 right-0 z-50">
                                        <EmojiPicker 
                                            onEmojiClick={(emojiData) => {
                                                setNewMessage(prev => prev + emojiData.emoji);
                                            }}
                                            theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    {!isRecording && !newMessage.trim() && !selectedFile ? (
                        <button
                            type="button"
                            onClick={startRecording}
                            className="p-3 bg-gray-100 dark:bg-slate-700 text-gray-500 hover:text-primary-600 rounded-2xl transition-colors"
                        >
                            <Mic size={20} />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                        >
                            <Send size={20} />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default ChatWindow;
