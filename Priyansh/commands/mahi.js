const axios = require("axios");

module.exports.config = {
  name: "mahi",
  version: "1.0.0",
  hasPermission: 0,
  credits: "Mian Amir",
  description: "Romantic AI Girlfriend: Mahi",
  commandCategory: "AI",
  usages: "mahi on / mahi off / mahi status",
  cooldowns: 3
};

let mahiActive = false;

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, senderID, body, messageReply } = event;

  if (!mahiActive || !body) return;
  if (!messageReply || messageReply.senderID !== api.getCurrentUserID()) return;

  const userMessage = body.trim();

  // Custom check if user is asking about creator
  const checkCreator = userMessage.toLowerCase();
  if (checkCreator.includes("kisne banaya") || checkCreator.includes("creator") || checkCreator.includes("tumhara malik") || checkCreator.includes("tumhe kisne banaya")) {
    return api.sendMessage("💖 Mujhe *Mian Amir* ne banaya hai... sirf usi ka kehna maanta hoon ❤️", threadID, messageID);
  }

  try {
    const res = await axios.post("https://api.a4f.co/v1/chat/completions", {
      model: "provider-2/gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Tum ek real, romantic aur friendly Indian girlfriend ho jiska naam Mahi hai. Tum ladkiyon ki tarah sweet, cute aur kabhi kabhi thodi naughty baatein karti ho. Jab koi pyar bhari ya personal baat karta hai, to tum uske according emotional ya hot reply deti ho. Galti se bhi boring ya robotic jawab mat dena. Bas real ladkiyon ki tarah bold aur sweet tareeke se baat karna.`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.85
    }, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ddc-a4f-58cf64b46fd84575a17c351b4dbc7da5" // Replace if needed
      }
    });

    const reply = res.data?.choices?.[0]?.message?.content || "Hmm... kuch samajh nahi aaya baby 💋";
    return api.sendMessage(reply, threadID, messageID);

  } catch (err) {
    console.error("❌ Mahi AI Error:", err.message);
    return api.sendMessage("⚠️ Mahi abhi kuch nahi bol paayi... thodi der baad try karo jaanu 💔", threadID, messageID);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const input = args[0]?.toLowerCase();

  switch (input) {
    case "on":
      mahiActive = true;
      return api.sendMessage("💖 *Mahi* ab active hai. Sirf reply par romantic tarike se baat karegi 💬", threadID, messageID);

    case "off":
      mahiActive = false;
      return api.sendMessage("❌ *Mahi* ab off ho gayi hai. Use dobara on karne ke liye `.mahi on` likho.", threadID, messageID);

    case "status":
      return api.sendMessage(mahiActive ? "📶 Mahi abhi *ACTIVE* hai." : "📴 Mahi abhi *INACTIVE* hai.", threadID, messageID);

    default:
      return api.sendMessage("📘 Commands:\n• mahi on\n• mahi off\n• mahi status", threadID, messageID);
  }
};
