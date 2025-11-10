const Message = require('../models/Message');
const User = require('../models/User');

module.exports = (io) => {
    // Store active rooms and typing users
    const activeRooms = new Map();
    const typingUsers = new Map();

    const socketAuth = async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            const user = await User.findById(decoded.id);
            if (!user) {
                return next(new Error('User not found'));
            }
            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    };

    io.use(socketAuth);

    io.on('connection', async (socket) => {
        console.log(`User connected: ${socket.user.username}`);

        // Update user's online status
        await User.findByIdAndUpdate(socket.user._id, { isOnline: true });
        io.emit('user_status', { userId: socket.user._id, isOnline: true });

        // Join global chat
        socket.join('global');

        // Handle chat messages
        socket.on('send_message', async (data) => {
            try {
                const message = await Message.create({
                    sender: socket.user._id,
                    content: data.content,
                    room: data.room || 'global',
                    receiver: data.receiver
                });

                const populatedMessage = await Message.findById(message._id)
                    .populate('sender', 'username avatar')
                    .populate('receiver', 'username avatar');

                if (data.receiver) {
                    // Private message
                    socket.to(data.receiver).emit('new_message', populatedMessage);
                    socket.emit('new_message', populatedMessage);
                } else {
                    // Global message
                    io.to(data.room || 'global').emit('new_message', populatedMessage);
                }
            } catch (error) {
                socket.emit('error', { message: 'Error sending message' });
            }
        });

        // Handle typing indicator
        socket.on('typing', (data) => {
            const room = data.room || 'global';
            if (data.isTyping) {
                typingUsers.set(`${socket.user._id}_${room}`, {
                    userId: socket.user._id,
                    username: socket.user.username,
                    room
                });
            } else {
                typingUsers.delete(`${socket.user._id}_${room}`);
            }
            
            const roomTypingUsers = Array.from(typingUsers.values())
                .filter(user => user.room === room);
            
            socket.to(room).emit('typing_users', roomTypingUsers);
        });

        // Handle private chat rooms
        socket.on('join_private', async (otherUserId) => {
            const roomId = [socket.user._id, otherUserId].sort().join('_');
            socket.join(roomId);
            
            // Get chat history
            const messages = await Message.find({
                room: roomId
            })
            .populate('sender', 'username avatar')
            .populate('receiver', 'username avatar')
            .sort('-createdAt')
            .limit(50);
            
            socket.emit('private_history', messages);
        });

        // Handle message reactions
        socket.on('add_reaction', async ({ messageId, reaction }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;

                // Add or update reaction
                const existingReaction = message.reactions.find(
                    r => r.user.toString() === socket.user._id.toString()
                );

                if (existingReaction) {
                    existingReaction.type = reaction;
                } else {
                    message.reactions.push({
                        user: socket.user._id,
                        type: reaction
                    });
                }

                await message.save();
                io.to(message.room).emit('message_reaction', {
                    messageId,
                    reaction,
                    userId: socket.user._id
                });
            } catch (error) {
                socket.emit('error', { message: 'Error adding reaction' });
            }
        });

        // Handle read receipts
        socket.on('mark_read', async ({ messageId }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;

                const alreadyRead = message.readBy.some(
                    read => read.user.toString() === socket.user._id.toString()
                );

                if (!alreadyRead) {
                    message.readBy.push({
                        user: socket.user._id,
                        readAt: new Date()
                    });
                    await message.save();

                    io.to(message.room).emit('message_read', {
                        messageId,
                        userId: socket.user._id
                    });
                }
            } catch (error) {
                socket.emit('error', { message: 'Error marking message as read' });
            }
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.user.username}`);
            
            // Update user's online status and last seen
            await User.findByIdAndUpdate(socket.user._id, {
                isOnline: false,
                lastSeen: new Date()
            });
            
            // Clean up typing indicators
            Array.from(typingUsers.entries())
                .filter(([key]) => key.startsWith(socket.user._id.toString()))
                .forEach(([key]) => typingUsers.delete(key));
            
            io.emit('user_status', {
                userId: socket.user._id,
                isOnline: false,
                lastSeen: new Date()
            });
        });
    });
};