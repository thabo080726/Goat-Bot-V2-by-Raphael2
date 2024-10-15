const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require('crypto');

const AUTHOR_NAME = "Raphael scholar";
const AUTHOR_HASH = crypto.createHash('sha256').update(AUTHOR_NAME).digest('hex');
const UNSPLASH_ACCESS_KEY = "y0qx6ZUpPzymNC16YQZYT8_9Hx_6Jb-jWGXFIlEB0Is";

module.exports = {
  config: {
    name: "unsplash",
    aliases: ["pic", "photo"],
    version: "1.0.0",
    author: AUTHOR_NAME,
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Search and get images"
    },
    longDescription: {
      en: "Search for images or get random images from specific categories using Unsplash API"
    },
    category: "media",
    guide: {
      en: "{prefix}unsplash [search query] | {prefix}image random [category]"
    }
  },

  getImage: async function(query, isRandom = false) {
    let endpoint = "https://api.unsplash.com/photos/random";
    let params = {
      client_id: UNSPLASH_ACCESS_KEY,
      count: 1
    };

    if (isRandom && query) {
      params.collections = await this.getCategoryCollection(query);
    } else if (!isRandom && query) {
      endpoint = "https://api.unsplash.com/search/photos";
      params.query = query;
      params.per_page = 1;
    }

    const response = await axios.get(endpoint, { params });
    const imageData = isRandom ? response.data[0] : response.data.results[0];

    if (!imageData) {
      throw new Error("No image found for the given query");
    }

    return {
      url: imageData.urls.regular,
      author: imageData.user.name,
      description: imageData.description || imageData.alt_description || "No description available"
    };
  },

  getCategoryCollection: async function(category) {
    const collections = {
      nature: "3330448",
      architecture: "3348849",
      food: "3330455",
      travel: "3356584",
      animals: "3330452"
    };
    return collections[category.toLowerCase()] || "";
  },

  onStart: async function ({ api, event, args }) {
    if (crypto.createHash('sha256').update(this.config.author).digest('hex') !== AUTHOR_HASH) {
      return api.sendMessage("Unauthorized: Author name has been modified.", event.threadID, event.messageID);
    }

    const query = args.join(" ");
    const isRandom = query.toLowerCase().startsWith("random");
    let searchQuery = isRandom ? args.slice(1).join(" ") : query;

    try {
      const image = await this.getImage(searchQuery, isRandom);
      const imagePath = path.join(__dirname, "cache", `${Date.now()}.jpg`);
      
      const imageResponse = await axios.get(image.url, { responseType: "arraybuffer" });
      await fs.outputFile(imagePath, imageResponse.data);

      const message = {
        body: `🖼️ ${isRandom ? "Random Image" : "Image Search Result"}:\n\n📸 By: ${image.author}\n📝 Description: ${image.description}`,
        attachment: fs.createReadStream(imagePath)
      };

      await api.sendMessage(message, event.threadID, event.messageID);
      await fs.remove(imagePath);
    } catch (error) {
      console.error(`Image command error: ${error.message}`);
      let errorMessage = "An error occurred while fetching the image. Please try again.";
      if (error.message.includes("No image found")) {
        errorMessage = `No image found for "${searchQuery}". Please try a different query.`;
      }
      api.sendMessage(errorMessage, event.threadID, event.messageID);
    }
  }
};

