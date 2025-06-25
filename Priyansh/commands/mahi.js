const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "mahi",
  version: "2.5.0",
  hasPermssion: 0,
  credits: "Mian Amir",
  description: "AI with memory using Gemini 2.5 Flash (OpenRouter)",
  commandCategory: "chatbots",
  usages: "mahi [message]",
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

module.exports.run = async function ({ api, event, args }) {
  const senderID = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;

  const isCommand = args.length > 0;
  const userInput = isCommand ? args.join(" ") : (event.type === "message_reply" ? event.body : "");

  if (!userInput) {
    return api.sendMessage("💬 कृपया .mahi [message] लिखो ताकि AI जवाब दे सके।", threadID, messageID);
  }

  const userName = await getUserName(api, senderID);
  const currentTime = moment().toISOString();

  const allData = loadData();
  const history = allData[senderID] || [];

  history.push({ role: "user", content: userInput, time: currentTime });

  const messages = [
    {
      role: "system",
      content: `तुम एक समझदार और प्यारी महिला AI हो। ${userName} तुमसे बात कर रहा है। Hindi या Punjabi में ही जवाब दो, चाहे user English में पूछे।`
    },
    ...history
  ];

  const apiKey = "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"; // ✅ OpenRouter API key
  const url = "https://openrouter.ai/api/v1/chat/completions";

  try {
    api.sendTypingIndicator(threadID, true);

    const res = await axios.post(
      url,
      {
        model: "google/gemini-2.5-flash",
        messages: messages,
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
    allData[senderID] = history;
    saveData(allData);

    return api.sendMessage(aiReply, threadID, messageID);
  } catch (error) {
    console.error("❌ Gemini API Error:", error.response?.data || error.message);
    return api.sendMessage("⚠️ AI जवाब नहीं दे पाया। कृपया बाद में प्रयास करें।", threadID, messageID);
  }
};
