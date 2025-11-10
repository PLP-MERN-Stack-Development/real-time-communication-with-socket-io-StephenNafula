import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Container,
    Grid,
    Paper,
    Typography,
    Divider,
    IconButton
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageInput from './MessageInput';
import UserList from './UserList';
import MessageList from './MessageList';

function ChatRoom() {
    const { user, logout } = useAuth();
    const {
        messages,
        onlineUsers,
        typingUsers,
        sendMessage,
        sendTypingStatus,
        joinPrivateChat
    } = useSocket();
    const [selectedUser, setSelectedUser] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});
    const messageEndRef = useRef(null);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const counts = {};
        messages.forEach(msg => {
            if (msg.receiver && msg.sender._id !== user._id && !msg.readBy.includes(user._id)) {
                counts[msg.sender._id] = (counts[msg.sender._id] || 0) + 1;
            }
        });
        setUnreadCounts(counts);
    }, [messages, user._id]);

    const handleUserSelect = (userId) => {
        setSelectedUser(userId);
        joinPrivateChat(userId);
        setUnreadCounts(prev => ({ ...prev, [userId]: 0 }));
    };

    const handleSendMessage = (content) => {
        sendMessage(content, selectedUser ? undefined : 'global', selectedUser);
    };

    const handleTyping = (isTyping) => {
        sendTypingStatus(isTyping, selectedUser ? undefined : 'global');
    };

    const filteredMessages = messages.filter(msg => {
        if (selectedUser) {
            return (
                (msg.sender._id === selectedUser && msg.receiver === user._id) ||
                (msg.sender._id === user._id && msg.receiver === selectedUser)
            );
        }
        return !msg.receiver;
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
                            <UserList
                                users={onlineUsers}
                                selectedUser={selectedUser}
                                onUserSelect={handleUserSelect}
                                unreadCounts={unreadCounts}
                            />
                        </Paper>
                    </Grid>
                    <Grid item xs={9}>
                        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                <Typography variant="h6">
                                    {selectedUser ? `Chat with ${onlineUsers.find(u => u._id === selectedUser)?.username}` : 'Global Chat'}
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
