import React, { useState } from 'react';
import { Check, CheckCheck, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import API from '../services/api';

const MessageBubble = ({ message, isOwn, onDelete, onEdit }) => {
    const [showMenu, setShowMenu] = useState(false);
    const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 animate-in slide-in-from-bottom-2 duration-300`}>
            <div
                className={`max-w-[85%] sm:max-w-[70%] px-3 py-2 rounded-2xl shadow-sm relative group transition-all hover:shadow-md ${
                    isOwn
                        ? 'bg-[#dcf8c6] dark:bg-[#056162] text-gray-800 dark:text-gray-100 rounded-tr-none border-b border-black/5'
                        : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100 rounded-tl-none border-b border-black/5'
                }`}
            >
                {message.mediaFile?.url && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-black/5 bg-black/5">
                        {message.mediaFile.type === 'voice' ? (
                            <audio src={message.mediaFile.url} controls className="max-w-full h-9" />
                        ) : (
                            <div className="relative">
                                <img src={message.mediaFile.url} alt="attachment" className="max-w-full h-auto max-h-60 object-cover cursor-pointer" />
                            </div>
                        )}
                    </div>
                )}
                
                <div className="pr-12">
                    <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                </div>
                
                <div className="absolute bottom-1 right-2 flex items-center space-x-1 select-none">
                    <span className="text-[10px] opacity-60 font-medium">{time}</span>
                    {isOwn && (
                        <div className="flex items-center">
                            {message.readBy?.length > 1 ? (
                                <CheckCheck size={14} className="text-[#34b7f1]" />
                            ) : (
                                <CheckCheck size={14} className="text-gray-400 dark:text-gray-500" />
                            )}
                        </div>
                    )}
                </div>

                {isOwn && (
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button 
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 hover:bg-black/5 rounded-full text-gray-400"
                        >
                            <MoreVertical size={14} />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-7 bg-white dark:bg-[#233138] shadow-2xl rounded-xl border border-gray-100 dark:border-white/5 py-1 z-20 w-28 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={() => { onEdit(message); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 flex items-center space-x-2 dark:text-gray-300"
                                >
                                    <Edit2 size={13} /> <span>Edit</span>
                                </button>
                                <button 
                                    onClick={() => { onDelete(message._id); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center space-x-2 text-red-500"
                                >
                                    <Trash2 size={13} /> <span>Delete</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;
