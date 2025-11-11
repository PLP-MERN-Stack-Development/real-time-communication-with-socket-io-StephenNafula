import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Container,
    Grid,
    Paper,
    Typography,
    Divider,
    IconButton,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    Logout as LogoutIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import ChatSidebar from './ChatSidebar';

function ChatRoom() {
    const { user, logout } = useAuth();
    const {
        messages,
        onlineUsers,
        typingUsers,
        sendMessage,
        sendTypingStatus,
        joinPrivateChat,
        joinChannel,
        activeRoom,
        socket
        ,channels
    } = useSocket();
    const [selectedUser, setSelectedUser] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});
    const messageEndRef = useRef(null);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const counts = {};
        const mySocketId = socket?.id;
        messages.forEach(msg => {
            // count unread private messages per sender
            if (msg.isPrivate && msg.senderId && mySocketId && msg.senderId !== mySocketId) {
                const readBy = msg.readBy || [];
                if (!readBy.includes(mySocketId)) {
                    counts[msg.senderId] = (counts[msg.senderId] || 0) + 1;
                }
            }
        });
        setUnreadCounts(counts);
    }, [messages, socket?.id]);

    const handleSelectChat = (selection) => {
        if (!selection) return;
        if (selection.type === 'private') {
            const userId = selection.id;
            setSelectedUser(userId);
            joinPrivateChat(userId);
            setUnreadCounts(prev => ({ ...prev, [userId]: 0 }));
        } else if (selection.type === 'channel') {
            // channel switching
            setSelectedUser(null);
            if (selection.id && joinChannel) {
                joinChannel(selection.id);
            }
        }
    };

    const handleSendMessage = (content) => {
        if (selectedUser) {
            // send private message to selected user (uses receiver param)
            sendMessage(content, 'private', selectedUser);
        } else {
            // send to global/public room
            sendMessage({ content }, 'public');
        }
    };

    const handleTyping = (isTyping) => {
        // set typing for current active room (joinPrivateChat sets activeRoom)
        sendTypingStatus(isTyping);
    };

    const filteredMessages = messages.filter(msg => {
        if (selectedUser) {
            // when a private chat is selected, show messages for the active private room
            if (activeRoom) {
                return msg.room === activeRoom;
            }
            return msg.isPrivate && (msg.senderId === selectedUser || msg.senderId === socket?.id);
        }
        // public/global messages are those without isPrivate flag or room === 'public'
        return !msg.isPrivate || msg.room === 'public';
    });

    return (
        <Container maxWidth="xl">
            <Box sx={{ flexGrow: 1, mt: 2, height: '90vh' }}>
                <Grid container spacing={2} sx={{ height: '100%' }}>
                    <Grid item xs={3}>
                        <Paper sx={{ height: '100%', p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">
                                    Welcome, {user?.username}
                                </Typography>
                                <IconButton onClick={logout} color="error">
                                    <LogoutIcon />
                                </IconButton>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <ChatSidebar
                                users={onlineUsers}
                                channels={channels}
                                selectedChat={selectedUser ? { type: 'private', id: selectedUser } : null}
                                onSelectChat={handleSelectChat}
                                notifications={unreadCounts}
                                onlineStatuses={Object.fromEntries((onlineUsers || []).map(u => [u.id || u._id || u.socketId, u.status || 'online']))}
                                typingUsers={typingUsers}
                            />
                        </Paper>
                    </Grid>
                    <Grid item xs={9}>
                        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                <Typography variant="h6">
                                    {selectedUser ? `Chat with ${onlineUsers.find(u => u.id === selectedUser)?.username}` : 'Global Chat'}
                                </Typography>
                                {typingUsers.length > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        {typingUsers.map(u => u.username).join(', ')} typing...
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                                <MessageList
                                    messages={filteredMessages}
                                    currentUser={user}
                                />
                                <div ref={messageEndRef} />
                            </Box>
                            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                                <MessageInput
                                    onSend={handleSendMessage}
                                    onTyping={handleTyping}
                                />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
}

export default ChatRoom;
