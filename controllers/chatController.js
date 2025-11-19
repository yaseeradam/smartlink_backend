const Chat = require('../models/Chat');
const User = require('../models/User');

const createOrGetChat = async (req, res) => {
  try {
    const { participantId, orderId } = req.body;
    const userId = req.user.id;

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [userId, participantId] },
      order: orderId
    }).populate('participants', 'name avatar role');

    if (!chat) {
      chat = await Chat.create({
        participants: [userId, participantId],
        order: orderId,
        messages: []
      });
      
      await chat.populate('participants', 'name avatar role');
    }

    res.json({ success: true, chat });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id,
      isActive: true
    })
    .populate('participants', 'name avatar role')
    .populate('order', 'orderNumber status')
    .sort({ 'lastMessage.timestamp': -1 });

    res.json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id
    }).populate('participants', 'name avatar role');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Get paginated messages
    const messages = chat.messages
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice((page - 1) * limit, page * limit)
      .reverse();

    res.json({
      success: true,
      chat: {
        ...chat.toObject(),
        messages
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content, messageType = 'text', fileUrl } = req.body;
    const chatId = req.params.chatId;
    const senderId = req.user.id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: senderId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const newMessage = {
      sender: senderId,
      content,
      messageType,
      fileUrl,
      isRead: false
    };

    chat.messages.push(newMessage);
    chat.lastMessage = {
      content,
      sender: senderId,
      timestamp: new Date()
    };

    await chat.save();

    // Populate sender info for the new message
    await chat.populate('messages.sender', 'name avatar');
    const message = chat.messages[chat.messages.length - 1];

    // Emit real-time message
    const io = require('../server').io;
    const recipientId = chat.participants.find(p => p.toString() !== senderId);
    
    if (io && recipientId) {
      io.to(recipientId.toString()).emit('newMessage', {
        chatId,
        message,
        sender: req.user
      });
    }

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user.id;

    await Chat.updateOne(
      { _id: chatId, participants: userId },
      { $set: { 'messages.$[elem].isRead': true } },
      { arrayFilters: [{ 'elem.sender': { $ne: userId }, 'elem.isRead': false }] }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrGetChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  markMessagesAsRead
};