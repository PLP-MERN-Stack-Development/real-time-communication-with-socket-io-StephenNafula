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
    const [activeRoom, setActiveRoom] = useState('public');
    const { user } = useAuth();
    const channels = [
        { id: 'general', name: 'general' },
        { id: 'random', name: 'random' }
    ];

    useEffect(() => {
        if (!user) return;

        const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');

        setSocket(newSocket);

        // Notify server of new user
        newSocket.on('connect', () => {
            newSocket.emit('user_join', user.username || user);
        });

        // small function to play a short notification tone via Web Audio API
        const playNotificationSound = () => {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'sine';
                o.frequency.value = 1000;
                g.gain.value = 0.02; // low volume
                o.connect(g);
                g.connect(ctx.destination);
                o.start();
                o.stop(ctx.currentTime + 0.06);
                // close context after short delay to free resources
                setTimeout(() => {
                    try { ctx.close(); } catch (e) {}
                }, 100);
            } catch (e) {
                // ignore
            }
        };

        // Public messages
        newSocket.on('receive_message', (message) => {
            // server may send an array for initial messages
            if (Array.isArray(message)) {
                setMessages(message);
            } else {
                setMessages(prev => [...prev, message]);
            }
            try { playNotificationSound(); } catch (e) {}
        });

        // Private messages
        newSocket.on('private_message', (message) => {
            setMessages(prev => [...prev, message]);
            try { playNotificationSound(); } catch (e) {}
        });

        // User list
        newSocket.on('user_list', (userList) => {
            setOnlineUsers(userList);
        });

        newSocket.on('user_joined', (u) => {
            setMessages(prev => [...prev, { id: Date.now().toString(), system: true, message: `${u.username} joined` }]);
            setOnlineUsers(prev => [...prev.filter(x => x.id !== u.id), u]);
        });

        newSocket.on('user_left', (u) => {
            setMessages(prev => [...prev, { id: Date.now().toString(), system: true, message: `${u.username} left` }]);
            setOnlineUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: 'offline', lastSeen: u.lastSeen } : x));
        });

        newSocket.on('typing_users', (users) => {
            setTypingUsers(users);
        });

        newSocket.on('message_reaction', ({ messageId, reaction, userId }) => {
            setMessages(prev => prev.map(msg => {
                if (msg.id === messageId) {
                    return { ...msg, reactions: { ...(msg.reactions || {}), [userId]: reaction } };
                }
                return msg;
            }));
        });

        newSocket.on('message_read', ({ messageId, userId }) => {
            setMessages(prev => prev.map(msg => {
                if (msg.id === messageId) {
                    return { ...msg, readBy: [...(msg.readBy || []), userId] };
                }
                return msg;
            }));
        });

        newSocket.on('join_private_room', ({ room, messages: roomMessages }) => {
            setActiveRoom(room);
            // append room history
            setMessages(prev => [...prev, ...(roomMessages || [])]);
        });
        
        // Channel join response
        newSocket.on('join_channel', ({ channel, messages: channelMessages }) => {
            setActiveRoom(channel);
            setMessages(prev => [...prev, ...(channelMessages || [])]);
        });

        return () => {
            newSocket.close();
        };
    }, [user]);

    const sendMessage = (content, room = 'public', receiver = null) => {
        if (!socket) return;
        if (receiver) {
            // private message
            socket.emit('private_message', { to: receiver, message: content });
        } else {
            socket.emit('send_message', { ...content, room });
        }
    };

    const sendTypingStatus = (isTyping, room = null) => {
        if (!socket) return;
        const r = room || activeRoom || 'public';
        socket.emit('typing', { isTyping, room: r });
    };

    const joinPrivateChat = (userId) => {
        if (!socket) return;
        socket.emit('join_private_room', { otherUserId: userId });
    };

    const joinChannel = (channelId) => {
        if (!socket) return;
        socket.emit('join_channel', { channelId });
        setActiveRoom(channelId);
    };

    const addReaction = (messageId, reaction) => {
        if (!socket) return;
        socket.emit('message_reaction', { messageId, reaction });
    };

    const markMessageAsRead = (messageId) => {
        if (!socket) return;
        socket.emit('mark_message_read', { messageId });
    };

    const value = {
        socket,
        messages,
        onlineUsers,
        typingUsers,
        activeRoom,
        channels,
        sendMessage,
        sendTypingStatus,
        joinPrivateChat,
        joinChannel,
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
