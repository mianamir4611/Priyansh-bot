const axios = require("axios");

module.exports.config = {
    name: "Mahi", // Changed from Shona to Mahi
    version: "2.0.0",
    hasPermission: 0,
    credits: "Mian Amir", // Changed credits to Mian Amir
    description: "Your uninhibited AI companion", // Updated description
    commandCategory: "AI",
    usages: "on / off / status",
    cooldowns: 5,
};

// Global active flag
let mahiActive = false; // Changed from shonaActive to mahiActive

module.exports.handleEvent = async function ({ api, event }) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    if (!mahiActive || !body) return; // Changed from shonaActive to mahiActive
    if (!messageReply || messageReply.senderID !== api.getCurrentUserID()) return;

    const userQuery = body.trim();

    // ✅ Set to your own hosted Mahi API - IMPORTANT: This API needs to be capable of the desired responses.
    // The previous API was "https://jordan-amir-api.vercel.app/api/shona". You'll need to ensure
    // your API (jordan-amir-api.vercel.app/api/mahi) is configured to provide the desired "unfiltered" responses.
    const apiURL = `https://jordan-amir-api.vercel.app/api/mahi?message=${encodeURIComponent(userQuery)}&name=Mahi&author=Mian%20Amir&senderID=${senderID}`;

    try {
        const res = await axios.get(apiURL);
        // The API's response will dictate Mahi's personality.
        // You MUST ensure the API at `jordan-amir-api.vercel.app/api/mahi` is programmed to
        // respond in the "hot," "romantic," "sexy," and "abusive" (if provoked) manner you described.
        // This JavaScript code merely sends the message; the intelligence and personality
        // come from the external API you're calling.
        const reply = res.data?.reply || "⚠️ Mujhe abhi samajh nahi aaya, bolo na kya kehna chahte ho?";
        return api.sendMessage(reply, threadID, messageID);
    } catch (err) {
        console.error("API error:", err.message);
        return api.sendMessage("❌ Uff! Mera dimaag thoda ghum gaya. Shayad network problem hai, ya shayad tum kuch aisa keh rahe ho jo main abhi process nahi kar pa rahi.", threadID, messageID);
    }
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const input = args[0]?.toLowerCase();

    switch (input) {
        case "on":
            mahiActive = true; // Changed from shonaActive to mahiActive
            return api.sendMessage("✅ Mahi AI ab tumhare liye hazir hai, kahin bhi aur kabhi bhi!", threadID, messageID);

        case "off":
            mahiActive = false; // Changed from shonaActive to mahiActive
            return api.sendMessage("❌ Mahi AI thodi der ke liye chup ho gayi hai. Jab bulaoge, phir aa jaungi.", threadID, messageID);

        case "status":
            if (mahiActive) { // Changed from shonaActive to mahiActive
                return api.sendMessage("📶 Mahi AI filhaal tumse baat karne ke mood mein *ACTIVE* hai.", threadID, messageID);
            } else {
                return api.sendMessage("📴 Mahi AI abhi *INACTIVE* hai, kya tum mujhe jagana chahte ho?", threadID, messageID);
            }

        default:
            return api.sendMessage(
                "📘 Commands:\n• Mahi on (Mujhe jagane ke liye)\n• Mahi off (Mujhe sulaane ke liye)\n• Mahi status (Mera haal poochhne ke liye)",
                threadID,
                messageID
            );
    }
};
