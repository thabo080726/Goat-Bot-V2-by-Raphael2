const axios = require("axios");
const fs = require('fs');

module.exports = {
    config: {
        name: "youtube",
        aliases: ["v"],
        version: "1.0",
        author: "Raphael scholar",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Download from YouTube"
        },
        longDescription: {
            en: "Download videos or audio from YouTube"
        },
        category: "media",
        guide: {
            en: "-v [link/keyword]: download video\n-a [link/keyword]: download audio"
        }
    },

    onStart: async function ({ api, args, message, event }) {
        const action = args[0]?.toLowerCase();
        if (!action || !args[1]) return message.reply("❌ Please provide both action (-v or -a) and video link/keyword");

        if (action !== '-v' && action !== '-a')
            return message.reply("❌ Invalid action. Use -v for video or -a for audio");

        const msgSent = await message.reply("🔄 Processing your request...");
        const checkurl = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;

        try {
            const baseApi = await getBaseApi();
            let videoID, searchQuery;

            if (checkurl.test(args[1])) {
                const match = args[1].match(checkurl);
                videoID = match[1];
            } else {
                args.shift();
                searchQuery = args.join(" ");
                const searchResult = (await axios.get(`${baseApi}/ytFullSearch?songName=${encodeURIComponent(searchQuery)}`)).data[0];
                if (!searchResult) {
                    message.unsend(msgSent.messageID);
                    return message.reply("⭕ No results found for: " + searchQuery);
                }
                videoID = searchResult.id;
            }

            const format = action === '-v' ? 'mp4' : 'mp3';
            const path = `${__dirname}/cache/ytb_${format}_${videoID}.${format}`;

            const { data: { title, downloadLink, quality } } = await axios.get(`${baseApi}/ytDl3?link=${videoID}&format=${format}&quality=3`);

            const stream = await downloadFile(downloadLink, path);
            
            await message.reply({
                body: `🎵 Title: ${title}\n📊 Quality: ${quality}`,
                attachment: stream
            });

            message.unsend(msgSent.messageID);
            fs.unlinkSync(path);
        } catch (error) {
            message.unsend(msgSent.messageID);
            return message.reply(`❌ Error: ${error.message}`);
        }
    }
};

async function getBaseApi() {
    const base = await axios.get("https://raw.githubusercontent.com/Blankid018/D1PT0/main/baseApiUrl.json");
    return base.data.api;
}

async function downloadFile(url, path) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer'
    });
    
    fs.writeFileSync(path, Buffer.from(response.data));
    return fs.createReadStream(path);
}
