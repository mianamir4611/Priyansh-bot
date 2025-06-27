const axios = require("axios");

module.exports.config = {
  name: "mahi",
  version: "2.0.0",
  hasPermission: 0,
  credits: "Mian Amir",
  description: "Mahi - Cute girl chatbot",
  commandCategory: "AI",
  usages: "on / off / status",
  cooldowns: 5,
};

// Global active flag
let mahiActive = false;

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, senderID, body, messageReply } = event;

  if (!mahiActive || !body) return;
  if (!messageReply || messageReply.senderID !== api.getCurrentUserID()) return;

  const userQuery = body.trim();

  // 🩷 Replace this with your actual hosted API URL
  const apiURL = `https://jordan-amir-api.vercel.app/api/shona?message=${encodeURIComponent(userQuery)}&name=Mahi&author=Mian%20Amir&senderID=${senderID}`;

  try {
    const res = await axios.get(apiURL);
    let reply = res.data?.reply || "Umm... mujhe samajh nahi aaya 💭";

    // Make tone more friendly and like a real girl
    reply = `💖 Mahi: ${reply}`;

    return api.sendMessage(reply, threadID, messageID);
  } catch (err) {
    console.error("Mahi API error:", err.message);
    return api.sendMessage("🙁 Sorry yaar, mujhe abhi kuch reply nahi mila. Thodi der baad try karo na.", threadID, messageID);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const input = args[0]?.toLowerCase();

  switch (input) {
    case "on":
      mahiActive = true;
      return api.sendMessage("✨ Mahi ab sabhi groups mein active ho gayi hai. Kuch bhi pucho, main hoon na! 💬", threadID, messageID);

    case "off":
      mahiActive = false;
      return api.sendMessage("😴 Mahi abhi ke liye off ho gayi hai. Baad mein milte hain! 🌙", threadID, messageID);

    case "status":
      return api.sendMessage(
        mahiActive
          ? "📶 Mahi abhi *ACTIVE* hai, tumse baat karne ke liye ready! 😊"
          : "📴 Mahi abhi *INACTIVE* hai. Zara usse jagao pehle. 💤",
        threadID,
        messageID
      );

    default:
      return api.sendMessage(
        "📘 Mahi Commands:\n• mahi on\n• mahi off\n• mahi status\n\nTum kuch bhi puch sakte ho jab Mahi active ho 💕",
        threadID,
        messageID
      );
  }
};
