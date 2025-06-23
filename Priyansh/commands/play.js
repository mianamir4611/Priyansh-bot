const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "play",
    version: "1.0.3", // Updated version to reflect changes
    hasPermssion: 0,
    credits: "Mian Amir",
    description: "Download and play YouTube song or video from keyword search",
    commandCategory: "Media",
    usages: "[songName] or [video songName]",
    cooldowns: 5,
    dependencies: {
      "@distube/ytdl-core": "",
      "yt-search": "",
      "fs": "",
      "path": ""
    },
  },

  run: async function ({ api, event, args }) {
    let songName, type;

    // Parse command: .play <song> or .play video <song>
    if (args.length > 1 && args[0].toLowerCase() === "video") {
      type = "video";
      songName = args.slice(1).join(" ");
    } else {
      type = "audio";
      songName = args.join(" ");
    }

    if (!songName) {
      return api.sendMessage(
        "Please provide a song name. Usage: .play [songName] or .play video [songName]",
        event.threadID,
        event.messageID
      );
    }

    const processingMessage = await api.sendMessage(
      "✅ Processing your request. Please wait...",
      event.threadID,
      null,
      event.messageID
    );

    try {
      // Search for the song on YouTube
      const searchResults = await ytSearch(songName);
      if (!searchResults || !searchResults.videos.length) {
        throw new Error("No results found for your search query.");
      }

      // Get the top result
      const topResult = searchResults.videos[0];
      const videoUrl = `https://www.youtube.com/watch?v=${topResult.videoId}`;

      // Set filename based on type
      const safeFileName = topResult.title.replace(/[^a-zA-Z0-9 ]/g, ""); // Remove special characters
      const filename = `${safeFileName}.${type === "audio" ? "mp3" : "mp4"}`;
      const downloadPath = path.join(__dirname, filename);

      api.setMessageReaction("⌛", event.messageID, () => {}, true);

      // Download with @distube/ytdl-core
      const stream = ytdl(videoUrl, {
        filter: type === "video" ? "videoandaudio" : "audioonly",
        quality: type === "video" ? "highestvideo" : "highestaudio", // Fixed quality setting
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      });

      // Save the file
      const writeStream = fs.createWriteStream(downloadPath);
      stream.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        stream.on('error', (error) => {
          if (error.statusCode === 503) {
            reject(new Error("YouTube server unavailable (503). Please try again later."));
          } else if (error.message.includes("No such format found")) {
            reject(new Error("The requested format is not available for this video. Try another song or type."));
          } else {
            reject(error);
          }
        });
      });

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Send the file via Messenger
      await api.sendMessage(
        {
          attachment: fs.createReadStream(downloadPath),
          body: `🖤 Title: ${topResult.title}\n\nHere is your ${
            type === "audio" ? "audio" : "video"
          } 🎧:`,
        },
        event.threadID,
        () => {
          fs.unlinkSync(downloadPath); // Clean up the file
          api.unsendMessage(processingMessage.messageID); // Remove processing message
        },
        event.messageID
      );
    } catch (error) {
      console.error(`Failed to download and send song: ${error.message}`);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      api.sendMessage(
        `Failed to download song: ${error.message}`,
        event.threadID,
        event.messageID
      );
      api.unsendMessage(processingMessage.messageID);
    }
  },
};