const express = require('express');
const { body } = require('express-validator');
const {
  createOrGetChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  markMessagesAsRead
} = require('../controllers/chatController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create or get existing chat
router.post('/', auth, [
  body('participantId').notEmpty().withMessage('Participant ID is required')
], createOrGetChat);

// Get user's chats
router.get('/', auth, getUserChats);

// Get chat messages
router.get('/:chatId/messages', auth, getChatMessages);

// Send message
router.post('/:chatId/messages', auth, [
  body('content').notEmpty().withMessage('Message content is required')
], sendMessage);

// Mark messages as read
router.put('/:chatId/read', auth, markMessagesAsRead);

module.exports = router;