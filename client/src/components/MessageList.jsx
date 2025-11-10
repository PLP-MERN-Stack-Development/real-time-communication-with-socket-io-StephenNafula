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
    const { addReaction, markMessageAsRead } = useSocket();

    const handleReaction = (messageId, reaction) => {
        addReaction(messageId, reaction);
    };

    const handleRead = (messageId) => {
        markMessageAsRead(messageId);
    };

    const renderMessage = (message) => {
        const isOwnMessage = message.sender._id === currentUser._id;
        const hasBeenRead = message.readBy.some(read => 
            read.user !== message.sender._id
        );

        if (!isOwnMessage && !message.readBy.some(read => read.user === currentUser._id)) {
            handleRead(message._id);
        }

        return (
            <Box
                key={message._id}
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
                                {message.sender.username}
                            </Typography>
                        )}
                        <Typography variant="body1">
                            {message.content}
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
                                {format(new Date(message.createdAt), 'HH:mm')}
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
                        {message.reactions?.length > 0 && (
                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ mt: 1 }}
                            >
                                {message.reactions.map((reaction, index) => (
                                    <Tooltip
                                        key={index}
                                        title={`${reaction.user.username} reacted with ${reaction.type}`}
                                    >
                                        <Box
                                            sx={{
                                                backgroundColor: 'action.hover',
                                                borderRadius: 1,
                                                padding: '2px 4px'
                                            }}
                                        >
                                            {reaction.type}
                                        </Box>
                                    </Tooltip>
                                ))}
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
