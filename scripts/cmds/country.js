const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require('crypto');

module.exports = {
  config: {
    name: "country",
    aliases: ["nation", "countryinfo"],
    version: "2.0",
    author: "Raphael scholar",
    role: 0,
    shortDescription: { en: "Get comprehensive information about any country" },
    longDescription: { en: "Retrieve detailed information about a country including geography, demographics, economy, and more." },
    category: "utility",
    guide: { en: "Usage: !country <country name> [options]\nOptions:\n-i: Include images\n-w: Include weather info\n-c: Include currency info\n-l <lang>: Set language (e.g., en, vi)" }
  },

  onStart: async function ({ api, event, args, message }) {
    const countryName = args.join(" ").replace(/-(i|w|c|l)\s?(\S+)?/g, '').trim();
    if (!countryName) return message.reply("🌍 Enter a country name to embark on a global adventure!");

    const options = {
      includeImages: args.includes('-i'),
      includeWeather: args.includes('-w'),
      includeCurrency: args.includes('-c'),
      language: args.find(arg => arg.startsWith('-l'))?.split(' ')[1] || 'en'
    };

    try {
      const loadingMessage = await api.sendMessage("🔮 Summoning global knowledge... Prepare to be amazed!", event.threadID);

      const countryInfo = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}`);
      const country = countryInfo.data[0];

      let weatherInfo, currencyInfo, wikiSummary;

      if (options.includeWeather) {
        try {
          weatherInfo = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${country.capital[0]}&appid=a9b4c37c68380d91903251d40ffa89ec&units=metric`);
        } catch (error) {}
      }

      if (options.includeCurrency) {
        try {
          const currencyCode = Object.keys(country.currencies)[0];
          currencyInfo = await axios.get(`https://api.exchangerate-api.com/v4/latest/${currencyCode}`);
        } catch (error) {}
      }

      try {
        wikiSummary = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(country.name.common)}`);
      } catch (error) {}

      let messageBody = `
✨ Unlocking the Wonders of ${country.name.common} ✨

🏛️ Official Name: ${country.name.official}
🏙️ Capital: ${country.capital ? country.capital[0] : 'A mystery to be discovered'}
${options.includeWeather && weatherInfo ? `🌡️ Current Climate: ${weatherInfo.data.main.temp}°C, ${weatherInfo.data.weather[0].description}\n` : ''}
👥 Population: ${country.population.toLocaleString()} souls
🗣️ Languages: ${Object.values(country.languages || {}).join(", ") || 'A symphony of unspoken words'}
💰 Currency: ${country.currencies ? `${Object.values(country.currencies)[0].name} (${Object.keys(country.currencies)[0]})` : 'Treasures beyond measure'}
${options.includeCurrency && currencyInfo ? `💱 Exchange Magic: 1 ${Object.keys(country.currencies)[0]} conjures ${currencyInfo.data.rates.USD} USD\n` : ''}
🌐 Realm: ${country.region} (${country.subregion || 'A land of mystery'})
🚩 Banner of Pride: ${country.flag}
🗺️ Embark on Your Quest: https://www.google.com/maps/place/${encodeURIComponent(country.name.common)}

📜 Tales of Yore:
${wikiSummary ? wikiSummary.data.extract : 'Legends yet to be written.'}

🔍 Mystical Fact: The digital realm knows this land as ${country.tld ? '.' + country.tld[0] : 'a nameless wonder'}
📊 Dominion: ${country.area ? country.area.toLocaleString() + ' square kilometers of untamed beauty' : 'Boundless as the imagination'}

🌈 Your journey to ${country.name.common} awaits. Seize the adventure and etch your own legend!
      `;

      if (options.includeImages) {
        const imageUrls = [
          `https://source.unsplash.com/1600x900/?${encodeURIComponent(country.name.common)},landmark`,
          `https://source.unsplash.com/1600x900/?${encodeURIComponent(country.name.common)},culture`,
          `https://source.unsplash.com/1600x900/?${encodeURIComponent(country.name.common)},nature`
        ];

        const imageBuffers = await Promise.all(imageUrls.map(url => axios.get(url, { responseType: 'arraybuffer' }).catch(() => null)));
        const tempDir = path.join(__dirname, "cache");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const imagePaths = imageBuffers.filter(buffer => buffer !== null).map((buffer, index) => {
          const imagePath = path.join(tempDir, `country_image_${index}_${Date.now()}.jpg`);
          fs.writeFileSync(imagePath, Buffer.from(buffer.data));
          return imagePath;
        });

        await api.sendMessage(
          {
            body: messageBody,
            attachment: imagePaths.map(imagePath => fs.createReadStream(imagePath))
          },
          event.threadID,
          async () => {
            imagePaths.forEach(imagePath => fs.unlinkSync(imagePath));
            await api.unsendMessage(loadingMessage.messageID);
          }
        );
      } else {
        await api.sendMessage(messageBody, event.threadID);
        await api.unsendMessage(loadingMessage.messageID);
      }
    } catch (error) {
      console.error(error);
      api.sendMessage(`🌠 The cosmic energies couldn't align for ${countryName}. Perhaps it's a realm yet to be discovered? Check your spelling and try again, intrepid explorer!`, event.threadID);
    }
  }
};

const authorSignature = crypto.createHash('sha256').update("Raphael scholar").digest('hex');
if (module.exports.config.author !== "Raphael scholar" || crypto.createHash('sha256').update(module.exports.config.author).digest('hex') !== authorSignature) {
  throw new Error("Author verification failed. Do not modify the author name.");
}
