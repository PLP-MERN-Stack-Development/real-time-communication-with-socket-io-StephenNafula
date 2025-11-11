// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users and messages
const users = {};
const messages = [];
const typingUsers = {};
const privateRooms = {};
const messageReactions = new Map();
const channels = [
  { id: 'general', name: 'general' },
  { id: 'random', name: 'random' }
];
const channelMessages = {
  general: [],
  random: []
};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', (username) => {
    // If username already exists (same user reconnecting), remove old entry
    const existingUserId = Object.keys(users).find(id => users[id].username === username);
    if (existingUserId && existingUserId !== socket.id) {
      // Remove the old user entry to avoid duplicates
      delete users[existingUserId];
    }

    users[socket.id] = { 
      username, 
      id: socket.id,
      status: 'online'
    };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.id });
    console.log(`${username} joined the chat`);

    // Send existing messages to new user
    socket.emit('receive_message', messages);
  });

  // Handle chat messages
  socket.on('send_message', (messageData) => {
    const message = {
      ...messageData,
      id: Date.now().toString(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
      reactions: {},
      readBy: [socket.id],
      room: messageData.room || 'public'
    };
    
    messages.push(message);
    
    // Limit stored messages to prevent memory issues
    if (messages.length > 100) {
      messages.shift();
    }
    
    if (message.room === 'public') {
      io.emit('receive_message', message);
      messages.push(message);
    } else if (channels.find(c => c.id === message.room)) {
      // channel message
      channelMessages[message.room] = channelMessages[message.room] || [];
      channelMessages[message.room].push(message);
      // limit
      if (channelMessages[message.room].length > 200) channelMessages[message.room].shift();
      io.to(message.room).emit('receive_message', message);
    } else {
      // Send to specific room if it's a private message
      io.to(message.room).emit('receive_message', message);
    }
  });

  // Handle joining channels
  socket.on('join_channel', ({ channelId }) => {
    if (!channelId || !channels.find(c => c.id === channelId)) return;
    socket.join(channelId);
    socket.emit('join_channel', { channel: channelId, messages: channelMessages[channelId] || [] });
  });

  // Handle typing indicator
  socket.on('typing', ({ isTyping, room }) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      
      if (isTyping) {
        typingUsers[socket.id] = { username, room };
      } else {
        delete typingUsers[socket.id];
      }
      
      // Send typing indicators only to the relevant room
      if (room === 'public') {
        io.emit('typing_users', Object.values(typingUsers).filter(u => u.room === 'public'));
      } else {
        io.to(room).emit('typing_users', Object.values(typingUsers).filter(u => u.room === room));
      }
    }
  });

  // Handle message reactions
  socket.on('message_reaction', ({ messageId, reaction }) => {
    const username = users[socket.id]?.username;
    if (!username) return;

    // Update reactions for the message
    const message = messages.find(m => m.id === messageId) || 
                   Object.values(privateRooms).flat().find(m => m.id === messageId);
    
    if (message) {
      message.reactions[socket.id] = reaction;
      
      if (message.room === 'public') {
        io.emit('message_reaction', { messageId, reaction, userId: socket.id });
      } else {
        io.to(message.room).emit('message_reaction', { messageId, reaction, userId: socket.id });
      }
    }
  });

  // Handle message read receipts
  socket.on('mark_message_read', ({ messageId }) => {
    const message = messages.find(m => m.id === messageId) || 
                   Object.values(privateRooms).flat().find(m => m.id === messageId);
    
    if (message && !message.readBy.includes(socket.id)) {
      message.readBy.push(socket.id);
      
      if (message.room === 'public') {
        io.emit('message_read', { messageId, userId: socket.id });
      } else {
        io.to(message.room).emit('message_read', { messageId, userId: socket.id });
      }
    }
  });

  // Handle joining private rooms
  socket.on('join_private_room', ({ otherUserId }) => {
    const roomId = [socket.id, otherUserId].sort().join('-');
    
    socket.join(roomId);
    io.sockets.sockets.get(otherUserId)?.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!privateRooms[roomId]) {
      privateRooms[roomId] = [];
    }
    
    // Send room history to the user
    socket.emit('join_private_room', {
      room: roomId,
      messages: privateRooms[roomId]
    });
  });

  // Handle private messages
  socket.on('private_message', ({ to, message }) => {
    const roomId = [socket.id, to].sort().join('-');
    const messageData = {
      id: Date.now().toString(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      room: roomId,
      reactions: {},
      readBy: [socket.id]
    };
    
    // Store message in room history
    privateRooms[roomId] = privateRooms[roomId] || [];
    privateRooms[roomId].push(messageData);
    
    // Send to room
    io.to(roomId).emit('private_message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const { username } = users[socket.id];
      
      // Only mark as offline and remove if no other socket has this username
      const otherUserWithSameName = Object.keys(users).find(
        id => id !== socket.id && users[id].username === username && users[id].status === 'online'
      );
      
      if (!otherUserWithSameName) {
        // Broadcast user_left only if this is the last connection with this username
        io.emit('user_left', { 
          username, 
          id: socket.id,
          lastSeen: new Date().toISOString() 
        });
        console.log(`${username} left the chat`);
      }
      
      // Remove user from active list immediately
      delete users[socket.id];
    }
    
    delete typingUsers[socket.id];
    
    io.emit('user_list', Object.values(users));
    io.emit('typing_users', Object.values(typingUsers));
  });
});

// API routes
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io }; 