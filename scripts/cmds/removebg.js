const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "removebg",
        version: "1.0",
        author: "Raphael scholar",
        countDown: 5,
        role: 0,
        shortDescription: "Remove background from image",
        longDescription: "Remove background from image using remove.bg API",
        category: "image",
        guide: "{pn} Reply to an image"
    },

    onStart: async function ({ api, message, event, args }) {
        const reply = event.messageReply;
        
        if (!reply || !reply.attachments || !reply.attachments.length) {
            return message.reply("Please reply to an image to remove its background");
        }

        if (reply.attachments[0].type !== "photo") {
            return message.reply("This is not a photo");
        }

        const pathSave = path.join(__dirname, "cache");
        
        try {
            await fs.ensureDir(pathSave);
            
            const imageUrl = reply.attachments[0].url;
            const outputPath = path.join(pathSave, `no_bg_${Date.now()}.png`);

            message.reply("Processing your image, please wait...");

            const response = await axios({
                method: 'post',
                url: 'https://api.remove.bg/v1.0/removebg',
                data: {
                    image_url: imageUrl,
                    format: 'png',
                    size: 'auto',
                    type: 'auto'
                },
                headers: {
                    'X-Api-Key': 'LZ5yMcFVYhez3kUasWe3BttL',
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                encoding: null
            });

            if (response.status !== 200) {
                throw new Error(`Failed to remove background: ${response.status}`);
            }

            await fs.writeFile(outputPath, Buffer.from(response.data));

            await message.reply({
                body: "Here's your image with background removed:",
                attachment: fs.createReadStream(outputPath)
            });

            await fs.remove(outputPath);
        } catch (error) {
            console.error('Remove BG Error:', error.message);
            return message.reply("An error occurred while removing the background. Please try again later.");
        }
    }
};

