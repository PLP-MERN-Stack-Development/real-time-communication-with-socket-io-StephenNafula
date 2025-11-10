import React from 'react';
import {
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Badge,
    Typography
} from '@mui/material';
import { format } from 'date-fns';

function UserList({ users, selectedUser, onUserSelect, unreadCounts }) {
    return (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            <ListItemButton
                selected={!selectedUser}
                onClick={() => onUserSelect(null)}
            >
                <ListItemText
                    primary="Global Chat"
                    secondary={`${users.length} online users`}
                />
            </ListItemButton>
            {users.map((user) => (
                <ListItem
                    key={user._id}
                    disablePadding
                    secondaryAction={
                        unreadCounts[user._id] ? (
                            <Badge
                                badgeContent={unreadCounts[user._id]}
                                color="primary"
                            />
                        ) : null
                    }
                >
                    <ListItemButton
                        selected={selectedUser === user._id}
                        onClick={() => onUserSelect(user._id)}
                    >
                        <ListItemAvatar>
                            <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                variant="dot"
                                color={user.isOnline ? "success" : "error"}
                            >
                                <Avatar
                                    alt={user.username}
                                    src={user.avatar || `/default-avatar.png`}
                                />
                            </Badge>
                        </ListItemAvatar>
                        <ListItemText
                            primary={user.username}
                            secondary={
                                !user.isOnline && user.lastSeen ? (
                                    <Typography variant="caption" color="text.secondary">
                                        Last seen {format(new Date(user.lastSeen), 'HH:mm')}
                                    </Typography>
                                ) : null
                            }
                        />
                    </ListItemButton>
                </ListItem>
            ))}
        </List>
    );
}

export default UserList;
