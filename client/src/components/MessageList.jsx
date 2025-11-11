import React from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Tooltip,
    Stack
} from '@mui/material';
import { format } from 'date-fns';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DoneIcon from '@mui/icons-material/Done';
import { useSocket } from '../context/SocketContext';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

function MessageList({ messages, currentUser }) {
    const { addReaction, markMessageAsRead, socket } = useSocket();

    const handleReaction = (messageId, reaction) => {
        addReaction(messageId, reaction);
    };

    const handleRead = (messageId) => {
        markMessageAsRead(messageId);
    };

    const renderMessage = (message) => {
        const id = message._id || message.id;
        const content = message.content || message.message || '';
        const createdAt = message.createdAt || message.timestamp;
        const senderObj = message.sender && typeof message.sender === 'object'
            ? message.sender
            : { username: message.sender };
        const isOwnMessage = (message.senderId && socket && message.senderId === socket.id) || (currentUser && senderObj.username === currentUser.username);
        const readBy = message.readBy || [];
        const hasBeenRead = Array.isArray(readBy) ? readBy.length > 0 : false;

        // mark as read if it's not our message and we haven't marked it yet
        if (!isOwnMessage && socket && !readBy.includes(socket.id)) {
            handleRead(id);
        }

        // System message rendering (join/leave notifications)
        if (message.system) {
            return (
                <Box
                    key={id}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        mb: 2,
                        opacity: 0.7
                    }}
                >
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {content}
                    </Typography>
                </Box>
            );
        }

        return (
            <Box
                key={id}
                sx={{
                    display: 'flex',
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    mb: 2
                }}
            >
                <Box
                    sx={{
                        maxWidth: '70%'
                    }}
                >
                    <Paper
                        elevation={1}
                        sx={{
                            p: 2,
                            backgroundColor: isOwnMessage ? 'primary.main' : 'background.paper',
                            borderRadius: 2
                        }}
                    >
                        {!isOwnMessage && (
                            <Typography variant="subtitle2" color="text.secondary">
                                {senderObj.username}
                            </Typography>
                        )}
                        <Typography variant="body1">
                            {content}
                        </Typography>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mt: 1
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                {createdAt ? format(new Date(createdAt), 'HH:mm') : ''}
                            </Typography>
                            {isOwnMessage && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {hasBeenRead ? (
                                        <DoneAllIcon color="success" fontSize="small" />
                                    ) : (
                                        <DoneIcon color="action" fontSize="small" />
                                    )}
                                </Box>
                            )}
                        </Box>
                        {/* reactions can be an object map or array; normalize to array */}
                        {message.reactions && (
                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ mt: 1 }}
                            >
                                {Array.isArray(message.reactions)
                                    ? message.reactions.map((reaction, index) => (
                                        <Tooltip key={index} title={`${reaction.user?.username || reaction.user} reacted with ${reaction.type}`}>
                                            <Box sx={{ backgroundColor: 'action.hover', borderRadius: 1, padding: '2px 4px' }}>{reaction.type}</Box>
                                        </Tooltip>
                                    ))
                                    : Object.entries(message.reactions).map(([userId, type]) => (
                                        <Tooltip key={userId} title={`${userId} reacted with ${type}`}>
                                            <Box sx={{ backgroundColor: 'action.hover', borderRadius: 1, padding: '2px 4px' }}>{type}</Box>
                                        </Tooltip>
                                    ))
                                }
                            </Stack>
                        )}
                    </Paper>
                    <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ mt: 0.5, justifyContent: isOwnMessage ? 'flex-end' : 'flex-start' }}
                    >
                        {REACTIONS.map((reaction) => (
                            <IconButton
                                key={reaction}
                                size="small"
                                onClick={() => handleReaction(message._id, reaction)}
                                sx={{ padding: '2px' }}
                            >
                                {reaction}
                            </IconButton>
                        ))}
                    </Stack>
                </Box>
            </Box>
        );
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {messages.map(renderMessage)}
        </Box>
    );
}

export default MessageList;
