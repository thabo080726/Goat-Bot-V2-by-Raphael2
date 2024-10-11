const axios = require('axios');

module.exports = {
  config: {
    name: "quiz",
    aliases: ["test"],
    version: "4.0",
    author: "Raphael scholar",
    countDown: 2,
    role: 0,
    longDescription: {
      en: "An interactive quiz game with multiple categories and stylized question display."
    },
    category: "games",
    guide: {
      en: "{pn} <category>"
    },
    envConfig: {
      reward: 10000
    }
  },
  langs: {
    en: {
      reply: "╭─────────────────╮\n│    📚 𝗤𝗨𝗜𝗭 𝗧𝗜𝗠𝗘    │\n╰─────────────────╯\n\n📌 Category: ${category}\n⏳ Time: 30 seconds\n💰 Reward: ${reward}$\n\n${question}\n\n${options}\n\n╭───────────────╮\n│ Reply with A, B, C, or D │\n╰───────────────╯",
      correctMessage: "╭─────────────────╮\n│   🎉 𝗖𝗢𝗥𝗥𝗘𝗖𝗧!   │\n╰─────────────────╯\n\n🏆 Congratulations, ${userName}!\n💡 You're on fire 🔥\n💰 You've won ${reward}$\n\n╭───────────────╮\n│    Keep it up, champ!    │\n╰───────────────╯",
      wrongMessage: "╭─────────────────╮\n│    😔 𝗢𝗢𝗣𝗦!    │\n╰─────────────────╯\n\n❌ Sorry, ${userName}.\n✅ The correct answer was:\n   ${correctAnswer}\n\n╭───────────────╮\n│   Better luck next time!   │\n╰───────────────╯",
      timeoutMessage: "╭─────────────────╮\n│   ⏰ 𝗧𝗜𝗠𝗘'𝗦 𝗨𝗣!   │\n╰─────────────────╯\n\n⌛ The 30 seconds have passed.\n✅ The correct answer was:\n   ${correctAnswer}\n\n╭───────────────╮\n│    Try to be quicker!    │\n╰───────────────╯"
    }
  },
  onStart: async function ({ message, event, usersData, commandName, getLang, args, api }) {
    const categories = ['english', 'math', 'physics', 'filipino', 'biology', 'chemistry', 'history', 'philosophy', 'random', 'science', 'anime', 'country', 'torf', 'coding', 'sports', 'minecraft', 'space', 'food', 'animal', 'country', 'electronic', 'youtuber', 'javascript', 'python', 'music', 'hindi', 'css', 'french', 'html', 'spanish', 'freefire', 'pubg', 'roblox', 'gta-v', 'fortnite', 'demonslayer', 'doraemon', 'one-piece', 'naruto', 'deathnote', 'dragon-ball', 'attack-on-titan', 'java', 'ruby', 'c', 'c-plus', 'php', 'xml', 'typescript', 'nodejs', 'express', 'vietnamese', 'bengali', 'japanese'];
    const category = args[0] ? args[0].toLowerCase() : categories[Math.floor(Math.random() * categories.length)];

    if (!categories.includes(category)) {
      const { getPrefix } = global.utils;
      const p = getPrefix(event.threadID);
      message.reply(`╭─────────────────╮\n│   ❌ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬   │\n╰─────────────────╯\n\n📚 Available categories:\n${categories.join(', ')}\n\n╭───────────────╮\n│ Usage: ${p}${commandName} <category> │\n│ Or: ${p}${commandName} for random    │\n╰───────────────╯`);
      return;
    }

    try {
      let response;
      if (category === 'torf') {
        response = await axios.get(`https://quizzzz-nhbt.onrender.com/api/quiz?category=torf`);
        const data = response.data;

        const quizz = {
          commandName,
          author: event.senderID,
          question: data.question,
          answer: data.answer === "true",
          messageID: null,
          reacted: false
        };

        const info = await message.reply(`╭─────────────────╮\n│    📚 𝗧𝗥𝗨𝗘 𝗢𝗥 𝗙𝗔𝗟𝗦𝗘    │\n╰─────────────────╯\n\n${data.question}\n\n╭───────────────╮\n│ 😆: True    😮: False │\n╰───────────────╯`);
        quizz.messageID = info.messageID;
        global.GoatBot.onReaction.set(info.messageID, quizz);

        setTimeout(() => {
          api.unsendMessage(info.messageID);
          global.GoatBot.onReaction.delete(info.messageID);
        }, 30000);
      } else if (category === 'anime') {
        response = await axios.get(`https://quizzzz-nhbt.onrender.com/api/quiz?category=anime`);
        const Qdata = response.data;

        if (!Qdata || !Qdata.photoUrl || !Qdata.animeName) {
          return;
        }

        const imageUrl = Qdata.photoUrl;
        const characterName = Qdata.animeName;

        message.reply({
          attachment: await global.utils.getStreamFromURL(imageUrl),
          body: `╭─────────────────╮\n│    📚 𝗔𝗡𝗜𝗠𝗘 𝗤𝗨𝗜𝗭    │\n╰─────────────────╯\n\n🎭 Who is this character?\n\n╭───────────────╮\n│ Reply with the character's name │\n╰───────────────╯`
        }, async (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: event.senderID,
            answer: characterName,
            answered: false,
            category,
          });

          setTimeout(() => {
            const reply = global.GoatBot.onReply.get(info.messageID);
            if (!reply.answered) {
              message.unsend(info.messageID);
              global.GoatBot.onReply.delete(info.messageID);
              message.reply(getLang('timeoutMessage').replace('${correctAnswer}', characterName));
            }
          }, 30000);
        });
      } else {
        response = await axios.get(`https://quizzzz-nhbt.onrender.com/api/quiz?category=${category}`);
        const Qdata = response.data;

        if (!Qdata || !Qdata.answer) {
          return;
        }

        const { question, options, answer } = Qdata;

        const shuffledOptions = shuffleArray([...options]);
        const formattedOptions = shuffledOptions.map((opt, index) => `${String.fromCharCode(65 + index)}. ${opt}`).join('\n');
        const correctAnswerIndex = shuffledOptions.findIndex(opt => opt.toLowerCase() === answer.toLowerCase());
        const correctAnswerLetter = String.fromCharCode(65 + correctAnswerIndex);

        const replyMessage = getLang('reply')
          .replace('${category}', category.charAt(0).toUpperCase() + category.slice(1))
          .replace('${reward}', this.config.envConfig.reward)
          .replace('${question}', question)
          .replace('${options}', formattedOptions);

        message.reply({ body: replyMessage }, async (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: event.senderID,
            answer: correctAnswerLetter,
            options: shuffledOptions,
            answered: false,
            category,
          });

          setTimeout(() => {
            const reply = global.GoatBot.onReply.get(info.messageID);
            if (!reply.answered) {
              message.unsend(info.messageID);
              global.GoatBot.onReply.delete(info.messageID);
              message.reply(getLang('timeoutMessage').replace('${correctAnswer}', `${correctAnswerLetter}. ${answer}`));
            }
          }, 30000);
        });
      }

    } catch (error) {
      message.reply(`╭─────────────────╮\n│    ❌ 𝗘𝗥𝗥𝗢𝗥    │\n╰─────────────────╯\n\n😔 Sorry, there was an error fetching questions for the ${category} category.\n\n╭───────────────╮\n│    Please try again later    │\n╰───────────────╯`);
      console.error('Error fetching quiz data:', error);
    }
  },

  onReply: async function ({ message, event, Reply, api, usersData, envConfig, getLang }) {
    try {
      const { author, messageID, answer, options, answered, category } = Reply;

      if (answered || author !== event.senderID) {
        message.reply("╭─────────────────╮\n│    ⚠️ 𝗪𝗔𝗥𝗡𝗜𝗡𝗚    │\n╰─────────────────╯\n\n👤 You are not the player of this question!\n\n╭───────────────╮\n│   Start your own quiz game   │\n╰───────────────╯");
        return;
      }

      const reward = envConfig?.reward || 10000;

      const userInfo = await api.getUserInfo(event.senderID);
      const userName = userInfo[event.senderID].name;

      if (formatText(event.body) === formatText(answer)) {
        global.GoatBot.onReply.delete(messageID);
        message.unsend(event.messageReply.messageID);

        const userData = await usersData.get(event.senderID);
        userData.money += reward;
        await usersData.set(event.senderID, userData);

        const correctMessage = getLang('correctMessage')
          .replace('${userName}', userName)
          .replace('${reward}', reward);
        message.reply(correctMessage);
      } else {
        const wrongMessage = getLang('wrongMessage')
          .replace('${userName}', userName)
          .replace('${correctAnswer}', `${answer}. ${options[answer.charCodeAt(0) - 65]}`);
        message.reply(wrongMessage);

        global.GoatBot.onReply.set(messageID, { ...Reply, answered: true });
      }
    } catch (error) {
      console.error('Error in onReply:', error);
    }
  },

  onReaction: async function ({ message, event, Reaction, api, usersData }) {
    try {
      const { author, question, answer, messageID, reacted } = Reaction;

      if (event.userID !== author || reacted) return;

      const reward = 10000;

      const userInfo = await api.getUserInfo(event.userID);
      const userName = userInfo[event.userID].name;

      const isCorrect = (event.reaction === '😆' && answer === true) || (event.reaction === '😮' && answer === false);

      if (isCorrect) {
        global.GoatBot.onReaction.delete(messageID);

        const userData = await usersData.get(event.userID);
        userData.money += reward;
        await usersData.set(event.userID, userData);

        api.sendMessage(`╭─────────────────╮\n│   🎉 𝗖𝗢𝗥𝗥𝗘𝗖𝗧!   │\n╰─────────────────╯\n\n🏆 Congratulations ${userName}!\n💰 You've won ${reward}$\n\n╭───────────────╮\n│    Keep up the good work!    │\n╰───────────────╯`, event.threadID, event.messageID);
      } else {
        api.sendMessage(`╭─────────────────╮\n│    😔 𝗢𝗢𝗣𝗦!    │\n╰─────────────────╯\n\n❌ Sorry, ${userName}.\n✅ The correct answer was: ${answer ? 'True' : 'False'}\n\n╭───────────────╮\n│   Better luck next time!   │\n╰───────────────╯`, event.threadID, event.messageID);

        global.GoatBot.onReaction.set(messageID, { ...Reaction, reacted: true });
      }
    } catch (error) {
      console.error('Error in onReaction:', error);
    }
  }
};

function formatText(text) {
  return text.trim().toLowerCase();
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports.formatText = formatText;
