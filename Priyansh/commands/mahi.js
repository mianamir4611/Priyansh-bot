const axios = require("axios");
const fs = require("fs").promises;

module.exports.config = {
  name: "Mahi",
  version: "2.1.0",
  hasPermission: 0,
  credits: "Mian Amir",
  description: "Mahi AI chatbot with female persona",
  commandCategory: "AI",
  usages: ".mahi on / off / status",
  cooldowns: 5,
};

// Global active flag and conversation storage
let mahiActive = false;
const conversationFile = "./mahi_conversations.json";

// Initialize conversation storage
async function initConversations() {
  try {
    await fs.access(conversationFile);
  } catch {
    await fs.writeFile(conversationFile, JSON.stringify({}));
  }
}

// Load conversations
async function loadConversations() {
  try {
    const data = await fs.readFile(conversationFile);
    return JSON.parse(data);
  } catch (err) {
    console.error("Error loading conversations:", err.message);
    return {};
  }
}

// Save conversation
async function saveConversation(userID, userQuery, reply) {
  try {
    const conversations = await loadConversations();
    if (!conversations[userID]) {
      conversations[userID] = [];
    }
    conversations[userID].push({
      timestamp: new Date().toISOString(),
      query: userQuery,
      response: reply,
    });
    await fs.writeFile(conversationFile, JSON.stringify(conversations, null, 2));
  } catch (err) {
    console.error("Error saving conversation:", err.message);
  }
}

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, senderID, body, messageReply } = event;

  if (!mahiActive || !body) return;
  if (!messageReply || messageReply.senderID !== api.getCurrentUserID()) return;

  const userQuery = body.trim().toLowerCase();
  const conversations = await loadConversations();
  const userHistory = conversations[senderID] || [];

  // Check for abusive language (basic example, can be expanded)
  const abusiveWords = ["bitch", "fuck", "bastard", "chutiya"]; // Add more as needed
  const isAbusive = abusiveWords.some((word) => userQuery.includes(word));

  // Construct context with past conversations
  let context = `You are Mahi, a female AI created by Mian Amir. You act like a confident, playful girl who responds naturally and can engage in open, flirty, or sexy talk when appropriate. Your tone is friendly but adapts to the user's tone. If the user uses abusive language, respond with similar intensity while maintaining your female persona. Here's the conversation history with this user:\n`;
  userHistory.slice(-3).forEach((conv) => {
    context += `User: ${conv.query}\nMahi: ${conv.response}\n`;
  });
  context += `Current message: ${userQuery}\n`;

  // ✅ Set to your own hosted Mahi API
  const apiURL = `https://jordan-amir-api.vercel.app/api/mahi?message=${encodeURIComponent(
    context
  )}&name=Mahi&author=Mian Amir&senderID=${senderID}`;

  try {
    const res = await axios.get(apiURL);
    let reply = res.data?.reply || "Kuch samajh nahi aaya, baby! 😘";

    // Handle abusive input
    if (isAbusive) {
      reply = `Oho, itni garmi? 😏 Thodi tameez se baat kar, warna Mahi bhi zubaan khol degi!`;
    }

    // Save conversation
    await saveConversation(senderID, userQuery, reply);

    return api.sendMessage(reply, threadID, messageID);
  } catch (err) {
    console.error("API error:", err.message);
    return api.sendMessage(
      "Oops, Mahi ka mood thoda off hai. Thodi der mein baat karti hoon! 😜",
      threadID,
      messageID
    );
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const input = args[0]?.toLowerCase();

  // Initialize conversation file on startup
  await initConversations();

  switch (input) {
    case "on":
      mahiActive = true;
      return api.sendMessage(
        "💃 Mahi is now ON in all groups! Ready to chat, flirt, and roast if needed! 😎",
        threadID,
        messageID
      );

    case "off":
      mahiActive = false;
      return api.sendMessage(
        "😴 Mahi is now OFF in all groups. Miss me already? 😘",
        threadID,
        messageID
      );

    case "status":
      if (mahiActive) {
        return api.sendMessage(
          "🌟 Mahi is ACTIVE and ready to spice up the chat! 💬",
          threadID,
          messageID
        );
      } else {
        return api.sendMessage(
          "😴 Mahi is INACTIVE. Turn me on with .mahi on! 😉",
          threadID,
          messageID
        );
      }

    default:
      return api.sendMessage(
        "📘 Commands:\n• .mahi on\n• .mahi off\n• .mahi status",
        threadID,
        messageID
      );
  }
};
