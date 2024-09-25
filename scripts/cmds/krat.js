const axios = require("axios");
const crypto = require("crypto");

const AUTHOR = "Raphael ilom";
const AUTHOR_HASH = crypto.createHash("sha256").update(AUTHOR).digest("hex");

function verifyAuthor() {
  const currentHash = crypto.createHash("sha256").update(AUTHOR).digest("hex");
  return currentHash === AUTHOR_HASH;
}

const AI_MODELS = {
  default: "llama3-70b-8192",
  fallback: "llama-3.1-70b-versatile",
  gpt4: "gpt-4-32k-0613",
};

const PERSONALITY_TYPES = [
  "lover", "helpful", "friendly", "toxic", "bisaya", "horny", "tagalog", "professional", "poetic", "philosopher"
];

const API_ENDPOINT = "https://apis-v69.onrender.com/g4o";

module.exports = {
  config: {
    name: "krat",
    version: "2.0",
    author: AUTHOR,
    category: "ai",
    cooldown: 5,
  },
  onStart: async function ({ usersData }) {
    if (!verifyAuthor()) {
      console.error("Unauthorized: Author verification failed.");
      process.exit(1);
    }
    await this.initializeUserPreferences(usersData);
  },
  onChat: async function({ message, args, event, commandName, usersData }) {
    if (!event.body?.toLowerCase().startsWith("krat")) return;

    const { reply, messageID } = message;
    const { senderID, threadID } = event;
    const input = args.slice(1);

    if (!verifyAuthor()) {
      return reply("Unauthorized: This module has been tampered with.");
    }

    const userData = await usersData.get(senderID);
    const { name, settings, gender } = userData;
    const userGender = gender === 2 ? "male" : "female";
    const personality = settings.personality || "helpful";

    if (!input.length) {
      return this.showHelp(reply, name);
    }

    if (input[0].toLowerCase() === "set" && input.length > 1) {
      return this.setPersonality(input[1], senderID, usersData, reply);
    }

    if (input[0].toLowerCase() === "model" && input.length > 1) {
      return this.setModel(input[1], senderID, usersData, reply);
    }

    const response = await this.getAIResponse(input.join(" "), senderID, name, personality, userGender, settings.model);
    const sentMessage = await reply(response);

    global.GoatBot.onReply.set(sentMessage.messageID, { commandName, senderID, personality });
  },
  onReply: async function({ message, args, event, Reply, usersData }) {
    const { senderID, body } = event;
    const { commandName, personality } = Reply;

    if (Reply.senderID !== senderID || body?.toLowerCase().startsWith("-unsend") || body?.toLowerCase().startsWith("krat")) return;

    const userData = await usersData.get(senderID);
    const { name, gender, settings } = userData;
    const userGender = gender === 2 ? "male" : "female";

    const response = await this.getAIResponse(args.join(" ") || "👍", senderID, name, personality, userGender, settings.model);
    const sentMessage = await message.reply(response);

    global.GoatBot.onReply.set(sentMessage.messageID, { commandName, senderID, personality });
  },
  showHelp: function(reply, name) {
    const availablePersonalities = PERSONALITY_TYPES.map((p, i) => `${i + 1}. ${p}`).join("\n");
    return reply(`Hello ${name}, how can I assist you today?\n\nAvailable commands:
    • krat set <personality>: Set your AI assistant's personality
    • krat model <model>: Set your preferred AI model
    • Just start your message with "krat" to chat with the AI

Available personalities:
${availablePersonalities}

Example: krat set friendly

Available models:
• default
• fallback
• gpt4

Example: krat model gpt4`);
  },
  setPersonality: async function(choice, senderID, usersData, reply) {
    const lowerChoice = choice.toLowerCase();
    if (PERSONALITY_TYPES.includes(lowerChoice)) {
      await usersData.set(senderID, { settings: { personality: lowerChoice } });
      return reply(`Successfully changed assistant personality to ${lowerChoice}`);
    } else {
      return reply(`Invalid choice. Available personalities are:\n${PERSONALITY_TYPES.join(", ")}`);
    }
  },
  setModel: async function(choice, senderID, usersData, reply) {
    const lowerChoice = choice.toLowerCase();
    if (Object.keys(AI_MODELS).includes(lowerChoice)) {
      await usersData.set(senderID, { settings: { model: lowerChoice } });
      return reply(`Successfully changed AI model to ${lowerChoice}`);
    } else {
      return reply(`Invalid choice. Available models are:\n${Object.keys(AI_MODELS).join(", ")}`);
    }
  },
  getAIResponse: async function(prompt, id, name, personality, gender, model = "default") {
    const postData = {
      id,
      prompt,
      name,
      model: AI_MODELS[model] || AI_MODELS.default,
      system: personality,
      gender
    };

    try {
      let response = await axios.post(API_ENDPOINT, postData);
      if (["i cannot", "i can't"].some(x => response.data.toLowerCase().startsWith(x))) {
        await axios.post(API_ENDPOINT, { ...postData, prompt: "clear" });
        response = await axios.post(API_ENDPOINT, { ...postData, model: AI_MODELS.fallback });
      }
      return `${response.data.replace(/😂/g, "🤭")}\n`;
    } catch (err) {
      console.error("AI Response Error:", err);
      return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
    }
  },
  initializeUserPreferences: async function(usersData) {
    const allUsers = await usersData.getAll();
    for (const [userId, userData] of Object.entries(allUsers)) {
      if (!userData.settings) {
        await usersData.set(userId, {
          settings: {
            personality: "helpful",
            model: "default"
          }
        });
      }
    }
  }
};
