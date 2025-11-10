import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const { token } = useAuth();

    useEffect(() => {
        if (!token) return;

        const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
            auth: { token }
        });

        setSocket(newSocket);

        newSocket.on('new_message', (message) => {
            setMessages(prev => [...prev, message]);
            new Audio('/notification.mp3').play().catch(() => {});
        });

        newSocket.on('user_status', ({ userId, isOnline, lastSeen }) => {
            setOnlineUsers(prev => {
                const updated = prev.filter(user => user.userId !== userId);
                if (isOnline) {
                    return [...updated, { userId, isOnline }];
                }
                return updated;
            });
        });

        newSocket.on('typing_users', (users) => {
            setTypingUsers(users);
        });

        newSocket.on('message_reaction', ({ messageId, reaction, userId }) => {
            setMessages(prev => prev.map(msg => {
                if (msg._id === messageId) {
                    return {
                        ...msg,
                        reactions: [
                            ...msg.reactions.filter(r => r.user !== userId),
                            { user: userId, type: reaction }
                        ]
                    };
                }
                return msg;
            }));
        });

        newSocket.on('message_read', ({ messageId, userId }) => {
            setMessages(prev => prev.map(msg => {
                if (msg._id === messageId) {
                    return {
                        ...msg,
                        readBy: [...msg.readBy, { user: userId, readAt: new Date() }]
                    };
                }
                return msg;
            }));
        });

        return () => {
            newSocket.close();
        };
    }, [token]);

    const sendMessage = (content, room = 'global', receiver = null) => {
        if (!socket) return;
        socket.emit('send_message', { content, room, receiver });
    };

    const sendTypingStatus = (isTyping, room = 'global') => {
        if (!socket) return;
        socket.emit('typing', { isTyping, room });
    };

    const joinPrivateChat = (userId) => {
        if (!socket) return;
        socket.emit('join_private', userId);
    };

    const addReaction = (messageId, reaction) => {
        if (!socket) return;
        socket.emit('add_reaction', { messageId, reaction });
    };

    const markMessageAsRead = (messageId) => {
        if (!socket) return;
        socket.emit('mark_read', { messageId });
    };

    const value = {
        socket,
        messages,
        onlineUsers,
        typingUsers,
        sendMessage,
        sendTypingStatus,
        joinPrivateChat,
        addReaction,
        markMessageAsRead
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
