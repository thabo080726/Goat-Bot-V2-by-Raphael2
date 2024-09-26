const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const GEMINI_API_KEY = 'AIzaSyAkq3h7r2VN_LKJxc01jK9jslW8zzhlkuM';
const CREATOR = 'Raphael scholar';

const conversationHistory = new Map();
const activeChatSessions = new Set();

async function getGeminiResponse(prompt, maxTokens = 500) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
  const data = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens }
  };

  try {
    const response = await axios.post(url, data);
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error fetching Genius response:', error.response ? error.response.data : error.message);
    return 'Sorry, I couldn\'t process your request at the moment.';
  }
}

async function logInteraction(user, prompt, response, responseTime) {
  const logPath = path.join(__dirname, 'genius_logs.txt');
  const logEntry = `User: ${user}\nPrompt: ${prompt}\nResponse: ${response}\nResponse Time: ${responseTime}ms\nTimestamp: ${new Date().toISOString()}\n\n`;

  try {
    await fs.appendFile(logPath, logEntry);
  } catch (err) {
    console.error('Error logging interaction:', err);
  }
}

function styleMessage(message) {
  return `╔══════ 🧠 Genius AI 🧠 ══════╗\n║ ${message.replace(/\n/g, '\n║ ')}\n╚════════════════════════════╝`;
}

async function handleMessage(api, event, args, prefix, isReply = false) {
  const userId = event.senderID;
  const threadId = event.threadID;
  const fullMessage = args.join(' ');

  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }

  const history = conversationHistory.get(userId);

  if (fullMessage.toLowerCase() === 'clear') {
    conversationHistory.set(userId, []);
    return api.sendMessage(styleMessage('Conversation history cleared.'), threadId, event.messageID);
  }

  if (fullMessage.toLowerCase() === 'help') {
    const helpMessage = `
Genius AI Commands:
• ${prefix}genius <prompt> - Ask Genius AI a question
• ${prefix}genius chat on - Start chat mode
• ${prefix}genius chat off - End chat mode
• ${prefix}genius clear - Clear conversation history
• ${prefix}genius help - Show this help message
    `;
    return api.sendMessage(styleMessage(helpMessage), threadId, event.messageID);
  }

  if (fullMessage.toLowerCase() === 'chat on') {
    activeChatSessions.add(userId);
    return api.sendMessage(styleMessage('Chat mode activated. You can now chat with Genius AI without using the prefix.'), threadId, event.messageID);
  }

  if (fullMessage.toLowerCase() === 'chat off') {
    activeChatSessions.delete(userId);
    return api.sendMessage(styleMessage('Chat mode deactivated. Use the prefix to interact with Genius AI.'), threadId, event.messageID);
  }

  history.push(`Human: ${fullMessage}`);

  const context = history.slice(-5).join('\n');
  const enhancedPrompt = `As an AI assistant created by ${CREATOR}, respond to the following conversation:\n\n${context}\n\nAI:`;

  const startTime = Date.now();
  const geminiResponse = await getGeminiResponse(enhancedPrompt, 1000);
  const responseTime = Date.now() - startTime;

  history.push(`AI: ${geminiResponse}`);
  if (history.length > 10) history.shift();

  await api.sendMessage(styleMessage(geminiResponse), threadId, event.messageID);
  await logInteraction(userId, fullMessage, geminiResponse, responseTime);

  api.setMessageReaction('🧠', event.messageID, (err) => {}, true);
}

module.exports = {
  config: {
    name: 'genius',
    author: CREATOR,
    version: '4.0',
    role: 0,
    category: 'intelligence',
    shortDescription: 'Advanced AI assistant using Gemini',
    longDescription: 'Interact with an advanced AI assistant powered by Gemini. Supports context-aware responses, conversation history, and chat mode.',
    guide: '{prefix}genius <prompt> | {prefix}genius chat on/off | {prefix}genius clear | {prefix}genius help'
  },
  onLoad: async function({ api }) {
    api.setMessageReaction('🧠', null, null, true);
  },
  onStart: async function ({ api, event, args, prefix }) {
    await handleMessage(api, event, args, prefix);
  },
  onChat: async function({ api, event, prefix }) {
    const userId = event.senderID;
    const lowercaseBody = event.body.toLowerCase();
    
    if (activeChatSessions.has(userId) || lowercaseBody.startsWith(`${prefix}genius`)) {
      const args = event.body.split(' ').filter(word => word.toLowerCase() !== 'genius' && word !== `${prefix}genius`);
      await handleMessage(api, event, args, prefix);
    }
  },
  onReply: async function({ api, event, messageReply, prefix }) {
    if (messageReply && messageReply.senderID === api.getCurrentUserID()) {
      const args = event.body.split(' ');
      await handleMessage(api, event, args, prefix, true);
    }
  }
};
