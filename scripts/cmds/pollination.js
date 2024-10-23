const axios = require('axios');
const fs = require('fs');

module.exports = {
  config: {
    name: "pollinations",
    aliases: ["poli"],
    version: "1.2",
    author: "Raphael scholar",
    countDown: 0,
    role: 0,
    shortDescription: {
      en: 'Generate images based Pollinations API on user prompts.'
    },
    longDescription: {
      en: "This command uses an external Pollinations API to create images from user-provided prompts."
    },
    category: "media",
    guide: {
      en: "{p}pollinations <prompt>"
    }
  },

  onStart: async function({ message, args, api, event }) {
    try {
      const prompt = args.join(" ");
      if (!prompt) {
        return message.reply("dd some prompts");
      }

      api.setMessageReaction("⏰", event.messageID, () => {}, true);

      const startTime = new Date().getTime();
    
      const baseURL = `https://c-v1.onrender.com/pollinations`;
      const params = {
        prompt: prompt,
        apikey: '$c-v1-7bejgsue6@iygv'
      };

      const response = await axios.get(baseURL, {
        params: params,
        responseType: 'stream'
      });

      const endTime = new Date().getTime();
      const timeTaken = (endTime - startTime) / 1000;

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      const fileName = 'emix.png';
      const filePath = `/tmp/${fileName}`; 

      const writerStream = fs.createWriteStream(filePath);
      response.data.pipe(writerStream);

      writerStream.on('finish', function() {
        message.reply({
          body: `Here is your generated image\n\n📝 𝗽𝗿𝗼𝗺𝗽𝘁: ${prompt}\n👑 𝗧𝗮𝗸𝗲𝗻 𝗧𝗶𝗺𝗲: ${timeTaken} seconds`,
          attachment: fs.createReadStream(filePath)
        });
      });

    } catch (error) {
      console.error('Error generating image:', error);
      message.reply("Moye Moye .");
    }
  }
};
