const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "ai",
  version: "3.5.0",
  hasPermssion: 0,
  credits: "Mian Amir",
  description: "AI text reply converted to voice using ElevenLabs",
  commandCategory: "chatbots",
  usages: "ai [message]",
  cooldowns: 3
};

const DATA_FILE = path.join(__dirname, "ai_data.json");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}");

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function getUserName(api, senderID) {
  try {
    const info = await api.getUserInfo(senderID);
    return info[senderID]?.name || "User";
  } catch {
    return "User";
  }
}

async function generateVoiceFromText(text, api, threadID, messageID) {
  const apiKey = "sk_8349f5bca5a7808a6706e09de8aabeb8c104d644dcf466f6"; // ✅ ElevenLabs API
  const voiceId = "ulZgFXalzbrnPUGQGs0S"; // ✅ Female voice
  const modelId = "eleven_multilingual_v2"; // ✅ Hindi + English support

  const outputPath = path.join(__dirname, "aivoice.mp3");

  try {
    const res = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: modelId,
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.9,
          style: 0.3
        }
      },
      {
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    fs.writeFileSync(outputPath, res.data);

    return api.sendMessage(
      { attachment: fs.createReadStream(outputPath) },
      threadID,
      () => fs.unlinkSync(outputPath),
      messageID
    );
  } catch (err) {
    console.error("❌ Voice Error:", err.message);
    return api.sendMessage("⚠️ Voice generation failed.", threadID, messageID);
  }
}

module.exports.run = async function ({ api, event, args }) {
  const senderID = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;

  const userInput = args.join(" ");
  if (!userInput) {
    return api.sendMessage("💬 .ai [message] likho taake AI se voice reply mile.", threadID, messageID);
  }

  const userName = await getUserName(api, senderID);
  const currentTime = moment().toISOString();
  const allData = loadData();
  const history = allData[senderID] || [];

  history.push({ role: "user", content: userInput, time: currentTime });

  const messages = [
    {
      role: "system",
      content: `You are a helpful and realistic female AI assistant. The user's name is ${userName}. Respond naturally.`
    },
    ...history
  ];

  const a4fApiKey = "ddc-a4f-58cf64b46fd84575a17c351b4dbc7da5"; // ✅ A4F Key
  const url = "https://api.a4f.co/v1/chat/completions";

  try {
    api.sendTypingIndicator(threadID, true);

    const res = await axios.post(
      url,
      {
        model: "provider-2/gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${a4fApiKey}`
        }
      }
    );

    const aiReply = res.data.choices[0].message.content;

    history.push({ role: "assistant", content: aiReply, time: currentTime });
    allData[senderID] = history;
    saveData(allData);

    return generateVoiceFromText(aiReply, api, threadID, messageID);
  } catch (err) {
    console.error("❌ AI Error:", err.message);
    return api.sendMessage("⚠️ AI reply failed. Try again later.", threadID, messageID);
  }
};