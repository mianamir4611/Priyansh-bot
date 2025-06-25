const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "mahi",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "Mian Amir",
  description: "AI with persistent memory for each user",
  commandCategory: "chatbots",
  usages: "ai [message]",
  cooldowns: 3,
  dependencies: {}
};

const DATA_FILE = path.join(__dirname, "ai_data.json");

// Ensure file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "{}");
}

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
    return api.sendMessage("👋 Hello! Please send a message with `.ai` or reply to my message.", threadID, messageID);
  }

  const userName = await getUserName(api, senderID);
  const currentTime = moment().toISOString();

  // Load saved data
  const allData = loadData();
  const history = allData[senderID] || [];

  // Add new user message to history
  history.push({ role: "user", content: userInput, time: currentTime });

  const messages = [
    { role: "system", content: `You are a helpful Messenger chatbot. User's name is ${userName}. Remember user info and give smart, relevant responses.` },
    ...history
  ];

  const apiKey = "ddc-a4f-58cf64b46fd84575a17c351b4dbc7da5";
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
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );

    const aiReply = res.data.choices[0].message.content;

    // Save AI reply too
    history.push({ role: "assistant", content: aiReply, time: currentTime });
    allData[senderID] = history;
    saveData(allData);

    return api.sendMessage(aiReply, threadID, messageID);
  } catch (error) {
    console.log("❌ API error:", error.message);
    return api.sendMessage("⚠️ AI response failed. Try again later.", threadID, messageID);
  }
};
