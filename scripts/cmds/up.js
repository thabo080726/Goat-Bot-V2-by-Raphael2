const axios = require("axios");
const fs = require("fs");
const moment = require("moment-timezone");

module.exports = {
    config: {
        name: "up",
        aliases: ["runtime"],
        version: "1.0.0",
        author: "Raphael scholar",
        countDown: 5,
        role: 0,
        shortDescription: "Check bot uptime",
        longDescription: "View bot runtime with image",
        category: "system",
        guide: "{p}up"
    },

    onStart: async function ({ message, event, api }) {
        if (this.config.author !== "Raphael scholar") {
            return message.reply("⚠️ Unauthorized modification detected!");
        }

        const time = process.uptime();
        const hours = Math.floor(time / (60 * 60));
        const minutes = Math.floor((time % (60 * 60)) / 60);
        const seconds = Math.floor(time % 60);
        
        const timeStart = moment.tz("Asia/Manila").format("DD/MM/YYYY - HH:mm:ss");
        
        const uptimeMessage = `╭──────────────╮\n   Bot Uptime\n╰──────────────╯\n\n➢ Today is: ${timeStart}\n➢ Bot has been active for:\n ◈ ${hours} hours\n ◈ ${minutes} minutes\n ◈ ${seconds} seconds\n\n╭──────────────╮\n Please wait...\n╰──────────────╯`;
        
        const imgPath = `${__dirname}/cache/uptime.jpg`;
        
        try {
            const imageResponse = await axios.get("https://i.ibb.co/QbWpW7J/Nqejvg-OQTG.jpg", { responseType: "arraybuffer" });
            fs.writeFileSync(imgPath, Buffer.from(imageResponse.data));
            
            await api.sendMessage({
                body: uptimeMessage,
                attachment: fs.createReadStream(imgPath)
            }, event.threadID, event.messageID);
            
            fs.unlinkSync(imgPath);
        } catch (error) {
            return api.sendMessage(`❌ Error: ${error.message}`, event.threadID, event.messageID);
        }
    }
};
