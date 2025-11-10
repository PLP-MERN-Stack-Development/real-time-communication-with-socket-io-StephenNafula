import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    IconButton,
    InputAdornment
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';

function MessageInput({ onSend, onTyping }) {
    const [message, setMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);

    const handleTyping = (event) => {
        const value = event.target.value;
        setMessage(value);

        if (!isTyping) {
            setIsTyping(true);
            onTyping(true);
        }

        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        const timeout = setTimeout(() => {
            setIsTyping(false);
            onTyping(false);
        }, 1000);

        setTypingTimeout(timeout);
    };

    useEffect(() => {
        return () => {
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    }, [typingTimeout]);

    const handleSend = () => {
        if (message.trim()) {
            onSend(message.trim());
            setMessage('');
            setIsTyping(false);
            onTyping(false);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    const handleAttachment = () => {
        console.log('File attachment clicked');
    };

    return (
        <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
                fullWidth
                multiline
                maxRows={4}
                value={message}
                onChange={handleTyping}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                variant="outlined"
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                onClick={handleAttachment}
                                edge="end"
                            >
                                <AttachFileIcon />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />
            <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!message.trim()}
                sx={{
                    alignSelf: 'flex-end',
                    padding: '12px'
                }}
            >
                <SendIcon />
            </IconButton>
        </Box>
    );
}

export default MessageInput;
