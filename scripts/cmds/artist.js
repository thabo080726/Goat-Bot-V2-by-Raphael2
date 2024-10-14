const axios = require('axios');
const crypto = require('crypto');

const AUTHOR_NAME = "Raphael scholar";
const AUTHOR_HASH = crypto.createHash('sha256').update(AUTHOR_NAME).digest('hex');

const ErrorCodes = {
  UNAUTHORIZED: 'E001',
  INVALID_INPUT: 'E002',
  API_ERROR: 'E003',
  NOT_FOUND: 'E004',
  NETWORK_ERROR: 'E005',
  UNKNOWN_ERROR: 'E999'
};

module.exports = {
  config: {
    name: "artist",
    aliases: ["findartist", "randomartist"],
    version: "1.2",
    author: AUTHOR_NAME,
    countDown: 5,
    role: 0,
    shortDescription: "Find artist information",
    longDescription: "Search for artist information or get a random artist recommendation",
    category: "music",
    guide: {
      en: "{pn} <artist name> | {pn} random"
    }
  },

  onStart: async function ({ message, args }) {
    try {
      if (crypto.createHash('sha256').update(this.config.author).digest('hex') !== AUTHOR_HASH) {
        throw new Error(`${ErrorCodes.UNAUTHORIZED}: Author name has been modified.`);
      }

      if (args.length === 0) {
        throw new Error(`${ErrorCodes.INVALID_INPUT}: Please provide an artist name or use 'random' to get a random artist.`);
      }

      const query = args.join(" ").toLowerCase();
      
      if (query === "random") {
        return await getRandomArtist(message);
      } else {
        return await searchArtist(query, message);
      }
    } catch (error) {
      handleError(error, message);
    }
  }
};

async function searchArtist(query, message) {
  try {
    await message.reply(`🔎 Searching for artist "${query}"... Please wait.`);

    const artist = await getArtistInfo(query);

    if (!artist) {
      throw new Error(`${ErrorCodes.NOT_FOUND}: No artist found. Please try a different search query.`);
    }

    const { name, genres, followers, popularity, images, external_urls } = artist;

    const response = `🎤 Artist: ${name}\n` +
                     `🎵 Genres: ${genres.join(", ") || "N/A"}\n` +
                     `👥 Followers: ${followers.total.toLocaleString()}\n` +
                     `🔥 Popularity: ${popularity}%\n` +
                     `🔗 Spotify URL: ${external_urls.spotify}\n\n` +
                     `Top Tracks:\n${await getTopTracks(artist.id)}`;

    if (images && images.length > 0) {
      const imageStream = await global.utils.getStreamFromURL(images[0].url);
      await message.reply({
        body: response,
        attachment: imageStream
      });
    } else {
      await message.reply(response);
    }
  } catch (error) {
    throw error;
  }
}

async function getRandomArtist(message) {
  try {
    await message.reply("🎲 Finding a random artist... Please wait.");

    const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    const randomOffset = Math.floor(Math.random() * 1000);
    const response = await axios.get(`https://api.spotify.com/v1/search`, {
      params: {
        q: randomChar,
        type: 'artist',
        limit: 1,
        offset: randomOffset
      },
      headers: {
        'Authorization': `Bearer ${await getSpotifyToken()}`
      }
    });

    if (response.data.artists.items.length === 0) {
      throw new Error(`${ErrorCodes.NOT_FOUND}: Couldn't find a random artist. Please try again.`);
    }

    const artist = response.data.artists.items[0];
    return await searchArtist(artist.name, message);
  } catch (error) {
    throw error;
  }
}

async function getArtistInfo(query) {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/search`, {
      params: {
        q: query,
        type: 'artist',
        limit: 1
      },
      headers: {
        'Authorization': `Bearer ${await getSpotifyToken()}`
      }
    });

    return response.data.artists.items[0];
  } catch (error) {
    if (error.response) {
      throw new Error(`${ErrorCodes.API_ERROR}: Spotify API error: ${error.response.status} - ${error.response.data.error.message}`);
    } else if (error.request) {
      throw new Error(`${ErrorCodes.NETWORK_ERROR}: Network error occurred while searching artist.`);
    } else {
      throw new Error(`${ErrorCodes.UNKNOWN_ERROR}: Unknown error occurred while searching artist.`);
    }
  }
}

async function getTopTracks(artistId) {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/top-tracks`, {
      params: {
        market: 'US'
      },
      headers: {
        'Authorization': `Bearer ${await getSpotifyToken()}`
      }
    });

    return response.data.tracks.slice(0, 5).map((track, index) => 
      `${index + 1}. ${track.name} (${formatDuration(track.duration_ms)})`
    ).join('\n');
  } catch (error) {
    if (error.response) {
      throw new Error(`${ErrorCodes.API_ERROR}: Spotify API error while fetching top tracks: ${error.response.status} - ${error.response.data.error.message}`);
    } else if (error.request) {
      throw new Error(`${ErrorCodes.NETWORK_ERROR}: Network error occurred while fetching top tracks.`);
    } else {
      throw new Error(`${ErrorCodes.UNKNOWN_ERROR}: Unknown error occurred while fetching top tracks.`);
    }
  }
}

async function getSpotifyToken() {
  const clientId = '138ff8d23e264edba4d5838c811056ce';
  const clientSecret = 'e3578c75d5e04cf59f21af566ef877cd';

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      'grant_type=client_credentials', 
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    if (error.response) {
      throw new Error(`${ErrorCodes.API_ERROR}: Spotify API error while getting token: ${error.response.status} - ${error.response.data.error}`);
    } else if (error.request) {
      throw new Error(`${ErrorCodes.NETWORK_ERROR}: Network error occurred while getting Spotify token.`);
    } else {
      throw new Error(`${ErrorCodes.UNKNOWN_ERROR}: Unknown error occurred while getting Spotify token.`);
    }
  }
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, '0')}`;
}

function handleError(error, message) {
  console.error('Error:', error);
  const errorMessage = error.message.includes(':') 
    ? error.message 
    : `${ErrorCodes.UNKNOWN_ERROR}: ${error.message}`;
  message.reply(`An error occurred: ${errorMessage}`);
}
