const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'whois_cache.json');
const COOLDOWN_TIME = 30000;
const userCooldowns = new Map();

const API_URL = 'https://api.api-ninjas.com/v1/whois?domain=';
const API_KEY = 'L7s+MIx6b6kGS4TVz11iyg==hgU2HWsYxZJdNn06';

const AUTHOR_NAME = "Raphael scholar";

async function loadCache() {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { whois: {}, lastFetch: 0 };
    }
}

async function saveCache(cache) {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache));
}

async function fetchWhois(domain) {
    const response = await axios.get(`${API_URL}${domain}`, {
        headers: { 'X-Api-Key': API_KEY }
    });
    return response.data;
}

async function getWhois(domain) {
    let cache = await loadCache();
    const now = Date.now();

    if (!cache.whois[domain] || now - cache.lastFetch > 24 * 60 * 60 * 1000) {
        cache.whois[domain] = await fetchWhois(domain);
        cache.lastFetch = now;
        await saveCache(cache);
    }

    return cache.whois[domain];
}

async function whoisCommand(api, event) {
    const userId = event.senderID;
    const now = Date.now();
    const domain = event.body.split(' ')[1];

    if (!domain) {
        return api.sendMessage("Please provide a domain name.", event.threadID);
    }

    if (userCooldowns.has(userId)) {
        const cooldownEnd = userCooldowns.get(userId) + COOLDOWN_TIME;
        if (now < cooldownEnd) {
            const remainingTime = (cooldownEnd - now) / 1000;
            return api.sendMessage(`Please wait ${remainingTime.toFixed(1)} seconds before using this command again.`, event.threadID);
        }
    }

    userCooldowns.set(userId, now);

    try {
        const whoisData = await getWhois(domain);
        const message = `🌐 Whois Information for ${domain}:\n\n${JSON.stringify(whoisData, null, 2)}\n\n🌟 Powered by Ninjas 🌟\n\nCredit: Raphael scholar`;
        api.sendMessage(message, event.threadID);
    } catch (error) {
        console.error('Error fetching whois data:', error);
        api.sendMessage(`Sorry, I couldn't fetch whois data at the moment. Please try again later.`, event.threadID);
    }
}

module.exports = {
    config: {
        name: "whois",
        aliases: ["whois", "domaininfo"],
        version: "1.0",
        author: AUTHOR_NAME,
        countDown: 30,
        role: 0,
        shortDescription: "Get whois information for a domain",
        longDescription: "Retrieve detailed whois information for a specified domain.",
        category: "information",
        guide: {
            en: "{p}whois <domain>"
        }
    },

    onStart: async function ({ api, event }) {
        if (module.exports.config.author !== AUTHOR_NAME) {
            return api.sendMessage("Unauthorized script modification detected. Author name cannot be changed.", event.threadID);
        }
        return whoisCommand(api, event);
    }
};
