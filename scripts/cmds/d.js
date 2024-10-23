const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

const dailyPath = path.join(__dirname, "daily.json");

if (!fs.existsSync(dailyPath)) {
  fs.writeFileSync(dailyPath, JSON.stringify({}, null, 2));
}

module.exports = {
  config: {
    name: "d",
    version: "1.1",
    author: "Raphael Scholar",
    countDown: 86400,
    role: 0,
    shortDescription: {
      en: "Claim daily rewards"
    },
    longDescription: {
      en: "Claim your daily rewards and maintain streak bonuses"
    },
    category: "economy",
    guide: {
      en: "{pn} [check/claim]"
    },
    priority: 1
  },

  onStart: async function ({ api, args, message, event, usersData }) {
    const { threadID, senderID } = event;
    const userData = await usersData.get(senderID);
    const commandName = args[0]?.toLowerCase();
    
    let dailyData = {};
    try {
      const data = fs.readFileSync(dailyPath, 'utf8');
      dailyData = data ? JSON.parse(data) : {};
    } catch (err) {
      dailyData = {};
    }
    
    if (!dailyData[senderID]) {
      dailyData[senderID] = {
        lastClaim: null,
        streak: 0,
        totalClaims: 0
      };
    }

    const user = dailyData[senderID];
    const now = moment().tz("Asia/Manila");
    const lastClaim = user.lastClaim ? moment(user.lastClaim).tz("Asia/Manila") : null;
    
    if (!commandName || commandName === "check") {
      const timeUntilReset = lastClaim ? moment.duration(lastClaim.add(1, 'day').diff(now)) : moment.duration(0);
      const canClaim = !lastClaim || now.diff(lastClaim, 'hours') >= 24;
      
      const streakBonus = Math.floor(user.streak / 5) * 500;
      const baseReward = 1000;
      const potentialReward = baseReward + streakBonus;
      
      let msg = "╭── 𝗗𝗔𝗜𝗟𝗬 𝗥𝗘𝗪𝗔𝗥𝗗𝗦 ──⭓\n";
      msg += `│ 𝗦𝘁𝗮𝘁𝘂𝘀: ${canClaim ? "🟢 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲" : "🔴 𝗖𝗹𝗮𝗶𝗺𝗲𝗱"}\n`;
      msg += `│ 𝗦𝘁𝗿𝗲𝗮𝗸: ${user.streak} 𝗱𝗮𝘆𝘀\n`;
      msg += `│ 𝗧𝗼𝘁𝗮𝗹 𝗖𝗹𝗮𝗶𝗺𝘀: ${user.totalClaims}\n`;
      msg += `│ 𝗡𝗲𝘅𝘁 𝗥𝗲𝘄𝗮𝗿𝗱: ${potentialReward.toLocaleString()}$\n`;
      
      if (!canClaim) {
        msg += `│ 𝗡𝗲𝘅𝘁 𝗖𝗹𝗮𝗶𝗺: ${timeUntilReset.hours()}h ${timeUntilReset.minutes()}m\n`;
      }
      
      msg += "╰──────────⭓";
      
      return message.reply(msg);
    }

    if (commandName === "claim") {
      if (lastClaim && now.diff(lastClaim, 'hours') < 24) {
        const timeUntilReset = moment.duration(lastClaim.add(1, 'day').diff(now));
        return message.reply(`❌ 𝗣𝗹𝗲𝗮𝘀𝗲 𝘄𝗮𝗶𝘁 ${timeUntilReset.hours()}h ${timeUntilReset.minutes()}m 𝗯𝗲𝗳𝗼𝗿𝗲 𝗰𝗹𝗮𝗶𝗺𝗶𝗻𝗴 𝗮𝗴𝗮𝗶𝗻.`);
      }

      const streakBonus = Math.floor(user.streak / 5) * 500;
      const baseReward = 1000;
      const reward = baseReward + streakBonus;

      const maintainedStreak = lastClaim && now.diff(lastClaim, 'hours') < 48;
      
      if (maintainedStreak) {
        user.streak += 1;
      } else {
        user.streak = 1;
      }
      
      user.lastClaim = now.format();
      user.totalClaims += 1;
      
      if (!userData.money) userData.money = 0;
      userData.money += reward;
      await usersData.set(senderID, userData);
      
      try {
        fs.writeFileSync(dailyPath, JSON.stringify(dailyData, null, 2));
      } catch (err) {
        console.error("Failed to save daily data:", err);
      }
      
      let msg = "╭── 𝗗𝗔𝗜𝗟𝗬 𝗖𝗟𝗔𝗜𝗠𝗘𝗗 ──⭓\n";
      msg += `│ 𝗥𝗲𝘄𝗮𝗿𝗱: ${reward.toLocaleString()}$\n`;
      msg += `│ 𝗦𝘁𝗿𝗲𝗮𝗸: ${user.streak} 𝗱𝗮𝘆𝘀\n`;
      
      if (user.streak % 5 === 0) {
        msg += `│ 🎉 𝗦𝘁𝗿𝗲𝗮𝗸 𝗕𝗼𝗻𝘂𝘀 𝗜𝗻𝗰𝗿𝗲𝗮𝘀𝗲𝗱!\n`;
      }
      
      if (!maintainedStreak && user.streak === 1 && lastClaim) {
        msg += `│ ⚠️ 𝗦𝘁𝗿𝗲𝗮𝗸 𝗿𝗲𝘀𝗲𝘁!\n`;
      }
      
      msg += "╰──────────⭓";
      
      return message.reply(msg);
    }

    return message.reply(`❌ 𝗜𝗻𝘃𝗮𝗹𝗶𝗱 𝗰𝗼𝗺𝗺𝗮𝗻𝗱. 𝗨𝘀𝗲 ${global.GoatBot.config.prefix}𝗱 [𝗰𝗵𝗲𝗰𝗸/𝗰𝗹𝗮𝗶𝗺]`);
  }
};
