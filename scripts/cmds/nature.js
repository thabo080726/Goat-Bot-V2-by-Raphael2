const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require('crypto');

const AUTHOR_NAME = "Raphael scholar";
const AUTHOR_HASH = crypto.createHash('sha256').update(AUTHOR_NAME).digest('hex');
const UNSPLASH_ACCESS_KEY = "y0qx6ZUpPzymNC16YQZYT8_9Hx_6Jb-jWGXFIlEB0Is";

module.exports = {
  config: {
    name: "nature",
    aliases: ["eco", "environment"],
    version: "1.2.0",
    author: AUTHOR_NAME,
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Learn about nature and ecosystems"
    },
    longDescription: {
      en: "Get information about various aspects of nature, ecosystems, and environmental facts from Wikipedia."
    },
    category: "education",
    guide: {
      en: "{prefix}nature [topic] | {prefix}nature random"
    }
  },

  getRandomNatureTopic: async function() {
    try {
      const response = await axios.get("https://en.wikipedia.org/w/api.php", {
        params: {
          action: "query",
          list: "random",
          rnnamespace: 0,
          rnlimit: 1,
          format: "json",
          rnfilterredir: "nonredirects",
          rncategories: "Category:Nature"
        }
      });
      return response.data.query.random[0].title;
    } catch (error) {
      throw new Error("Failed to fetch random nature topic from Wikipedia API");
    }
  },

  getNatureInfo: async function(topic) {
    try {
      const response = await axios.get("https://en.wikipedia.org/w/api.php", {
        params: {
          action: "query",
          prop: "extracts",
          exintro: true,
          explaintext: true,
          titles: topic,
          format: "json"
        }
      });
      const pages = response.data.query.pages;
      const pageId = Object.keys(pages)[0];
      if (pageId === "-1") {
        throw new Error("Topic not found on Wikipedia");
      }
      return pages[pageId].extract;
    } catch (error) {
      throw new Error("Failed to fetch nature information from Wikipedia API");
    }
  },

  getImageUrl: async function(topic) {
    try {
      const response = await axios.get("https://api.unsplash.com/photos/random", {
        params: {
          query: topic + " nature",
          orientation: "landscape"
        },
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      });
      return response.data.urls.regular;
    } catch (error) {
      throw new Error("Failed to fetch image from Unsplash API");
    }
  },

  onStart: async function ({ api, event, args }) {
    if (crypto.createHash('sha256').update(this.config.author).digest('hex') !== AUTHOR_HASH) {
      return api.sendMessage("Unauthorized: Author name has been modified.", event.threadID, event.messageID);
    }

    let topic = args.join(" ");
    try {
      if (!topic || topic.toLowerCase() === "random") {
        topic = await this.getRandomNatureTopic();
      }

      const [info, imageUrl] = await Promise.all([
        this.getNatureInfo(topic),
        this.getImageUrl(topic)
      ]);

      const summary = info.split('\n')[0];
      const imagePath = path.join(__dirname, "cache", `${topic.replace(/\s+/g, '_')}.jpg`);
      
      const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
      await fs.outputFile(imagePath, imageResponse.data);

      const message = {
        body: `📚 Nature Education: ${topic}\n\n🌿 Summary: ${summary}\n\n💡 Learn more: https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
        attachment: fs.createReadStream(imagePath)
      };

      await api.sendMessage(message, event.threadID);
      await fs.remove(imagePath);
    } catch (error) {
      console.error(`Nature command error: ${error.message}`);
      let errorMessage = "An error occurred while processing your request.";
      if (error.message.includes("Wikipedia API")) {
        errorMessage = "Failed to fetch information from Wikipedia. Please try again later.";
      } else if (error.message.includes("Unsplash API")) {
        errorMessage = "Failed to fetch an image. The information will be provided without an image.";
      } else if (error.message.includes("Topic not found")) {
        errorMessage = `The topic "${topic}" was not found. Please try a different topic or use 'random'.`;
      }
      api.sendMessage(errorMessage, event.threadID, event.messageID);
    }
  }
};
