// socket.js - Socket.io client setup

import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Message reaction types
export const REACTION_TYPES = {
  LIKE: '👍',
  LOVE: '❤️',
  LAUGH: '😂'
};

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [privateChats, setPrivateChats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [activeRoom, setActiveRoom] = useState('public');

  // Connect to socket server
  const connect = (username) => {
    socket.connect();
    if (username) {
      socket.emit('user_join', username);
    }
  };

  // Disconnect from socket server
  const disconnect = () => {
    socket.disconnect();
  };

  // Send a message
  const sendMessage = (message) => {
    socket.emit('send_message', { message });
  };

  // Send a private message
  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };

  // Join a private room
  const joinPrivateRoom = (otherUserId) => {
    socket.emit('join_private_room', { otherUserId });
    setActiveRoom(otherUserId);
  };

  // Leave a private room
  const leavePrivateRoom = () => {
    if (activeRoom !== 'public') {
      socket.emit('leave_private_room', { roomId: activeRoom });
      setActiveRoom('public');
    }
  };

  // Set typing status
  const setTyping = (isTyping) => {
    socket.emit('typing', { isTyping, room: activeRoom });
  };

  // React to a message
  const reactToMessage = (messageId, reaction) => {
    socket.emit('message_reaction', { messageId, reaction });
  };

  // Mark message as read
  const markMessageAsRead = (messageId) => {
    socket.emit('mark_message_read', { messageId });
  };

  // Socket event listeners
  useEffect(() => {
    // Connection events
    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    // Message events
    const onReceiveMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
      
      // Add notification if message is not in active room
      if (message.room && message.room !== activeRoom) {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          message: `New message from ${message.sender}`,
          room: message.room
        }]);
      }
    };

    const onPrivateMessage = (message) => {
      setLastMessage(message);
      
      // Add message to private chat messages
      setPrivateChats(prev => ({
        ...prev,
        [message.room]: [...(prev[message.room] || []), message]
      }));

      // Add notification if not in active room
      if (message.room !== activeRoom) {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          message: `New private message from ${message.sender}`,
          room: message.room
        }]);
      }
    };

    // User events
    const onUserList = (userList) => {
      setUsers(userList);
    };

    const onUserJoined = (user) => {
      // You could add a system message here
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} joined the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onUserLeft = (user) => {
      // You could add a system message here
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    // Typing events
    const onTypingUsers = (users) => {
      setTypingUsers(users);
    };

    // Message reactions and read receipts
    const onMessageReaction = ({ messageId, reaction, userId }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, reactions: { ...msg.reactions, [userId]: reaction } }
          : msg
      ));
    };

    const onMessageRead = ({ messageId, userId }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, readBy: [...(msg.readBy || []), userId] }
          : msg
      ));
    };

    // Private room events
    const onJoinPrivateRoom = ({ room, messages: roomMessages }) => {
      setPrivateChats(prev => ({
        ...prev,
        [room]: roomMessages
      }));
    };

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onPrivateMessage);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('typing_users', onTypingUsers);
    socket.on('message_reaction', onMessageReaction);
    socket.on('message_read', onMessageRead);
    socket.on('join_private_room', onJoinPrivateRoom);

    // Clean up event listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onPrivateMessage);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('typing_users', onTypingUsers);
      socket.off('message_reaction', onMessageReaction);
      socket.off('message_read', onMessageRead);
      socket.off('join_private_room', onJoinPrivateRoom);
    };
  }, []);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    privateChats,
    notifications,
    activeRoom,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    joinPrivateRoom,
    leavePrivateRoom,
    reactToMessage,
    markMessageAsRead,
  };
};

export default socket; 