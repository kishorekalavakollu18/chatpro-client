import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext';
import { toast } from 'react-hot-toast';

const SocketContext = createContext();

const ENDPOINT = 'http://localhost:5123';

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();
    const { setOnlineUsers, selectedChat, chats, setChats } = useChat();

    useEffect(() => {
        if (user) {
            const newSocket = io(ENDPOINT);
            setSocket(newSocket);

            newSocket.emit('setup', user);

            newSocket.on('connected', (onlineIds) => {
                setOnlineUsers(onlineIds);
            });

            newSocket.on('user online', (userId) => {
                setOnlineUsers((prev) => [...new Set([...prev, userId])]);
            });

            newSocket.on('user offline', (userId) => {
                setOnlineUsers((prev) => Array.isArray(prev) ? prev.filter((id) => id !== userId) : []);
            });

            newSocket.on('message received', (newMessageReceived) => {
                // Play sound
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
                audio.play().catch(e => console.log('Sound error:', e));

                // Update chats list in Sidebar
                setChats(prev => {
                    const chatId = newMessageReceived.chatType === '1to1' 
                        ? newMessageReceived.sender._id 
                        : newMessageReceived.group._id;
                    
                    const chatIndex = prev.findIndex(c => c._id === chatId);
                    if (chatIndex !== -1) {
                        const updatedChat = { 
                            ...prev[chatIndex], 
                            latestMessage: newMessageReceived,
                            unreadCount: (selectedChat?._id === chatId) ? prev[chatIndex].unreadCount : (prev[chatIndex].unreadCount || 0) + 1
                        };
                        const newChats = [...prev];
                        newChats.splice(chatIndex, 1);
                        return [updatedChat, ...newChats];
                    } else {
                        return [{
                            _id: chatId,
                            name: newMessageReceived.sender.name,
                            latestMessage: newMessageReceived,
                            unreadCount: 1,
                            type: newMessageReceived.chatType
                        }, ...prev];
                    }
                });

                // Toast if chat inactive
                const activeChatId = selectedChat?._id;
                const incomingChatId = newMessageReceived.chatType === '1to1' ? newMessageReceived.sender._id : newMessageReceived.group._id;
                
                if (activeChatId !== incomingChatId) {
                    toast.success(`New Message from ${newMessageReceived.sender.name}`, {
                        icon: '💬',
                    });
                }
            });

            newSocket.on('new friend request', ({ from }) => {
                toast(`${from.name} sent you a friend request!`, {
                    icon: '🤝',
                    duration: 5000,
                    style: { background: '#128c7e', color: '#fff' }
                });
            });

            return () => {
                newSocket.off('user online');
                newSocket.off('user offline');
                newSocket.off('message received');
                newSocket.off('new friend request');
                newSocket.disconnect();
            };
        }
    }, [user, setOnlineUsers, selectedChat, setChats]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
