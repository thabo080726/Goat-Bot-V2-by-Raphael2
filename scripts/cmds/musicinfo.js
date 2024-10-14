const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require('crypto');

const SPOTIFY_CLIENT_ID = "138ff8d23e264edba4d5838c811056ce";
const SPOTIFY_CLIENT_SECRET = "e3578c75d5e04cf59f21af566ef877cd";
const AUTHOR_NAME = "Raphael scholar";
const AUTHOR_HASH = crypto.createHash('sha256').update(AUTHOR_NAME).digest('hex');

module.exports = {
  config: {
    name: "musicinfo",
    aliases: ["mi", "music"],
    version: "2.0.0",
    author: AUTHOR_NAME,
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Play songs and get artist info"
    },
    longDescription: {
      en: "Play songs from Spotify and get detailed artist information."
    },
    category: "music",
    guide: {
      en: "{prefix}musicinfo play <song name> | {prefix}musicinfo artist <artist name> | {prefix}musicinfo random"
    }
  },

  getSpotifyToken: async function () {
    const tokenRes = await axios.post("https://accounts.spotify.com/api/token", 
      new URLSearchParams({ grant_type: "client_credentials" }).toString(), 
      {
        headers: {
          "Authorization": `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
    return tokenRes.data.access_token;
  },

  searchSpotifyTrack: async function (trackName, token) {
    const searchRes = await axios.get(`https://api.spotify.com/v1/search`, {
      headers: { "Authorization": `Bearer ${token}` },
      params: { q: trackName, type: "track", limit: 1 }
    });

    if (searchRes.data.tracks.items.length === 0) {
      throw new Error("No track found with the given name.");
    }

    return searchRes.data.tracks.items[0];
  },

  getArtistInfo: async function (query, token) {
    const response = await axios.get(`https://api.spotify.com/v1/search`, {
      params: { q: query, type: 'artist', limit: 1 },
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return response.data.artists.items[0];
  },

  getTopTracks: async function (artistId, token) {
    const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/top-tracks`, {
      params: { market: 'US' },
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return response.data.tracks.slice(0, 5).map((track, index) => 
      `${index + 1}. ${track.name} (${this.formatDuration(track.duration_ms)})`
    ).join('\n');
  },

  getRandomArtist: async function (token) {
    const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    const randomOffset = Math.floor(Math.random() * 1000);
    const response = await axios.get(`https://api.spotify.com/v1/search`, {
      params: { q: randomChar, type: 'artist', limit: 1, offset: randomOffset },
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.data.artists.items.length === 0) {
      throw new Error("Couldn't find a random artist. Please try again.");
    }

    return response.data.artists.items[0];
  },

  formatDuration: function (ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  },

  onStart: async function ({ api, event, args }) {
    try {
      if (crypto.createHash('sha256').update(this.config.author).digest('hex') !== AUTHOR_HASH) {
        throw new Error("Unauthorized: Author name has been modified.");
      }

      if (args.length < 2) {
        return api.sendMessage(`Invalid command. Usage:\n${this.config.guide.en}`, event.threadID, event.messageID);
      }

      const action = args[0].toLowerCase();
      const query = args.slice(1).join(" ");
      const token = await this.getSpotifyToken();

      switch (action) {
        case "play":
          await this.playSong(api, event, query, token);
          break;
        case "artist":
          await this.showArtistInfo(api, event, query, token);
          break;
        case "random":
          const randomArtist = await this.getRandomArtist(token);
          await this.showArtistInfo(api, event, randomArtist.name, token);
          break;
        default:
          api.sendMessage(`Invalid action. Use 'play', 'artist', or 'random'.`, event.threadID, event.messageID);
      }
    } catch (error) {
      console.error(error);
      api.sendMessage(`An error occurred: ${error.message}`, event.threadID, event.messageID);
    }
  },

  playSong: async function (api, event, trackName, token) {
    const track = await this.searchSpotifyTrack(trackName, token);
    const trackUrl = track.external_urls.spotify;

    const res = await axios.get(`https://for-devs.onrender.com/api/spotify/download?url=${encodeURIComponent(trackUrl)}&apikey=r-7cd80a49b615844502527915`);
    const songData = res.data;

    if (!songData || !songData.downloadUrl) {
      return api.sendMessage(`Unable to download song for "${trackName}". Please try again.`, event.threadID, event.messageID);
    }

    const songPath = path.join(__dirname, 'cache', `${songData.id}.mp3`);

    const songResponse = await axios.get(songData.downloadUrl, { responseType: 'arraybuffer' });
    await fs.outputFile(songPath, songResponse.data);
    await api.sendMessage({
      attachment: fs.createReadStream(songPath),
      body: `🎵 Title: ${songData.title}\n👤 Artists: ${songData.artists}`
    }, event.threadID, event.messageID);

    await fs.remove(songPath);
  },

  showArtistInfo: async function (api, event, artistName, token) {
    const artist = await this.getArtistInfo(artistName, token);

    if (!artist) {
      return api.sendMessage(`No artist found with the name "${artistName}".`, event.threadID, event.messageID);
    }

    const { name, genres, followers, popularity, images, external_urls } = artist;

    const response = `🎤 Artist: ${name}\n` +
                     `🎵 Genres: ${genres.join(", ") || "N/A"}\n` +
                     `👥 Followers: ${followers.total.toLocaleString()}\n` +
                     `🔥 Popularity: ${popularity}%\n` +
                     `🔗 Spotify URL: ${external_urls.spotify}\n\n` +
                     `Top Tracks:\n${await this.getTopTracks(artist.id, token)}`;

    if (images && images.length > 0) {
      const imageStream = await global.utils.getStreamFromURL(images[0].url);
      await api.sendMessage({
        body: response,
        attachment: imageStream
      }, event.threadID, event.messageID);
    } else {
      await api.sendMessage(response, event.threadID, event.messageID);
    }
  }
};

