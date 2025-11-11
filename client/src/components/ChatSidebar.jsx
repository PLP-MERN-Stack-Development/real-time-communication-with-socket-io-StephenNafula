import React, { useState } from 'react';
import {
    Box,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Typography,
    Tabs,
    Tab,
    Badge,
    Chip,
    IconButton,
    Menu,
    MenuItem,
} from '@mui/material';
import {
    PersonOutline,
    Circle,
    MoreVert,
    Search,
} from '@mui/icons-material';

const ChatSidebar = ({
    users,
    channels,
    selectedChat,
    onSelectChat,
    notifications,
    onlineStatuses,
    typingUsers,
}) => {
    const [activeTab, setActiveTab] = useState(0);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleUserMenuClick = (event, user) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setSelectedUser(user);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedUser(null);
    };

    const handleStartPrivateChat = () => {
        onSelectChat({ type: 'private', id: selectedUser.id });
        handleMenuClose();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return 'success';
            case 'away': return 'warning';
            default: return 'error';
        }
    };

    const isTyping = (userId) => {
        return typingUsers.some(user => user.id === userId);
    };

    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Channels" />
                <Tab label="Direct Messages" />
            </Tabs>

            <List sx={{ overflowY: 'auto', height: 'calc(100% - 48px)' }}>
                {activeTab === 0 ? (
                    // Channels List
                    channels.map(channel => (
                        <ListItem
                            key={channel.id}
                            button
                            selected={selectedChat?.id === channel.id}
                            onClick={() => onSelectChat({ type: 'channel', id: channel.id })}
                        >
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography component="span">#{channel.name}</Typography>
                                        {notifications[channel.id] > 0 && (
                                            <Badge
                                                badgeContent={notifications[channel.id]}
                                                color="primary"
                                                sx={{ ml: 1 }}
                                            />
                                        )}
                                    </Box>
                                }
                            />
                        </ListItem>
                    ))
                ) : (
                    // Users List (filter only online users)
                    users
                        .filter(user => user.status === 'online' || !user.status)
                        .map(user => (
                        <ListItem
                            key={user.id}
                            button
                            selected={selectedChat?.id === user.id}
                            secondaryAction={
                                <IconButton edge="end" onClick={(e) => handleUserMenuClick(e, user)}>
                                    <MoreVert />
                                </IconButton>
                            }
                        >
                            <ListItemAvatar>
                                <Badge
                                    overlap="circular"
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    badgeContent={
                                        <Circle
                                            sx={{
                                                backgroundColor: onlineStatuses[user.id] ? 'success.main' : 'error.main',
                                                borderRadius: '50%',
                                                width: 10,
                                                height: 10,
                                            }}
                                        />
                                    }
                                >
                                    <Avatar>
                                        <PersonOutline />
                                    </Avatar>
                                </Badge>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {user.username}
                                        {notifications[user.id] > 0 && (
                                            <Badge
                                                badgeContent={notifications[user.id]}
                                                color="primary"
                                                sx={{ ml: 1 }}
                                            />
                                        )}
                                    </Box>
                                }
                                secondary={
                                    isTyping(user.id) ? (
                                        <Typography variant="caption" color="primary">
                                            typing...
                                        </Typography>
                                    ) : null
                                }
                            />
                        </ListItem>
                    ))
                )}
            </List>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleStartPrivateChat}>Start Private Chat</MenuItem>
                <MenuItem onClick={handleMenuClose}>View Profile</MenuItem>
            </Menu>
        </Box>
    );
};

export default ChatSidebar;