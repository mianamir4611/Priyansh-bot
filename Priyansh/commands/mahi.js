const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "mahi",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Mian Amir",
  description: "AI GPT-4o reply using OpenRouter",
  commandCategory: "chatbots",
  usages: ".amir [text]",
  cooldowns: 2
};

const DATA_FILE = path.join(__dirname, "amir_memory.json");
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

module.exports.run = async function ({ api, event, args }) {
  const senderID = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;

  const userInput = args.join(" ");
  if (!userInput) {
    return api.sendMessage("🔎 .amir [message] likho!", threadID, messageID);
  }

  const userName = await getUserName(api, senderID);
  const currentTime = moment().toISOString();
  const memory = loadData();
  const history = memory[senderID] || [];

  history.push({ role: "user", content: userInput, time: currentTime });

  const messages = [
    {
      role: "system",
      content: `Tum ek friendly aur smart female AI ho. ${userName} tumse baat kar raha hai. Har message ka logical aur samajhdaar jawab do.`
    },
    ...history
  ];

  const apiKey = "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";
  const url = "https://openrouter.ai/api/v1/chat/completions";

  try {
    api.sendTypingIndicator(threadID, true);

    const res = await axios.post(
      url,
      {
        model: "openai/gpt-4o",
        messages,
        temperature: 0.7
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiReply = res.data.choices[0].message.content;

    history.push({ role: "assistant", content: aiReply, time: currentTime });
    memory[senderID] = history;
    saveData(memory);

    return api.sendMessage(aiReply, threadID, messageID);
  } catch (error) {
    console.error("❌ GPT-4o API Error:", error.response?.data || error.message);
    return api.sendMessage("⚠️ AI जवाब नहीं दे पाया। बाद में try करो.", threadID, messageID);
  }
};
