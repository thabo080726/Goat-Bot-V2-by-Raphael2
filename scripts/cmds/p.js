const fs = require("fs-extra");
const { utils } = global;
const axios = require("axios");

module.exports = {
    config: {
        name: "p",
        version: "1.0",
        author: "Raphael scholar",
        countDown: 5,
        role: 0,
        shortDescription: "View or change bot prefix",
        longDescription: "View current prefix or change bot prefix",
        category: "config",
        guide: {
            en: "   {pn}: view current prefix\n   {pn} <new prefix>: change prefix in your box\n   {pn} <new prefix> -g: change global prefix (admin only)\n   {pn} reset: reset to default prefix"
        }
    },

    langs: {
        en: {
            reset: "Your prefix has been reset to default: %1",
            onlyAdmin: "Only admin can change prefix of system bot",
            confirmGlobal: "Please react to this message to confirm change prefix of system bot",
            confirmThisThread: "Please react to this message to confirm change prefix in your box chat",
            successGlobal: "Changed prefix of system bot to: %1",
            successThisThread: "Changed prefix in your box chat to: %1",
            myPrefix: "🌐 System prefix: %1\n🛸 Your box chat prefix: %2"
        }
    },

    onStart: async function ({ message, role, args, commandName, event, threadsData, getLang }) {
        if (!args[0]) {
            try {
                const imgPath = `${__dirname}/cache/prefix.jpg`;
                const response = await axios.get("https://i.ibb.co/QbWpW7J/Nqejvg-OQTG.jpg", { responseType: "arraybuffer" });
                fs.writeFileSync(imgPath, Buffer.from(response.data));

                const msg = getLang("myPrefix", global.GoatBot.config.prefix, utils.getPrefix(event.threadID));
                await message.reply({ 
                    body: msg,
                    attachment: fs.createReadStream(imgPath)
                });
                fs.unlinkSync(imgPath);
                return;
            } catch (e) {
                return message.reply(getLang("myPrefix", global.GoatBot.config.prefix, utils.getPrefix(event.threadID)));
            }
        }

        if (args[0] == 'reset') {
            await threadsData.set(event.threadID, null, "data.prefix");
            return message.reply(getLang("reset", global.GoatBot.config.prefix));
        }

        const newPrefix = args[0];
        const formSet = {
            commandName,
            author: event.senderID,
            newPrefix
        };

        if (args[1] === "-g") {
            if (role < 2) return message.reply(getLang("onlyAdmin"));
            formSet.setGlobal = true;
        } else formSet.setGlobal = false;

        return message.reply(args[1] === "-g" ? getLang("confirmGlobal") : getLang("confirmThisThread"), (err, info) => {
            formSet.messageID = info.messageID;
            global.GoatBot.onReaction.set(info.messageID, formSet);
        });
    },

    onReaction: async function ({ message, threadsData, event, Reaction, getLang }) {
        const { author, newPrefix, setGlobal } = Reaction;
        if (event.userID !== author) return;
        if (setGlobal) {
            global.GoatBot.config.prefix = newPrefix;
            fs.writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
            return message.reply(getLang("successGlobal", newPrefix));
        } else {
            await threadsData.set(event.threadID, newPrefix, "data.prefix");
            return message.reply(getLang("successThisThread", newPrefix));
        }
    },

    onChat: async function ({ event, message, getLang }) {
        if (event.body && event.body.toLowerCase() === "prefix") {
            try {
                const imgPath = `${__dirname}/cache/prefix.jpg`;
                const response = await axios.get("https://i.ibb.co/QbWpW7J/Nqejvg-OQTG.jpg", { responseType: "arraybuffer" });
                fs.writeFileSync(imgPath, Buffer.from(response.data));

                const msg = getLang("myPrefix", global.GoatBot.config.prefix, utils.getPrefix(event.threadID));
                await message.reply({ 
                    body: msg,
                    attachment: fs.createReadStream(imgPath)
                });
                fs.unlinkSync(imgPath);
                return;
            } catch (e) {
                return message.reply(getLang("myPrefix", global.GoatBot.config.prefix, utils.getPrefix(event.threadID)));
            }
        }
    }
};

