const axios = require("axios");
const fs = require("fs").promises; // For file system operations
const path = require("path"); // For path manipulation

module.exports.config = {
    name: "Mahi",
    version: "2.0.0",
    hasPermission: 0,
    credits: "Mian Amir",
    description: "Your uninhibited AI companion with conversation logging.",
    commandCategory: "AI",
    usages: "on / off / status",
    cooldowns: 5,
};

// Global active flag
let mahiActive = false;

// Directory to save logs
const logDir = path.join(__dirname, 'Mahi_Logs');

// Ensure log directory exists
async function ensureLogDir() {
    try {
        await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
        console.error("Failed to create log directory:", error);
    }
}

// Call this once when the script loads
ensureLogDir();

module.exports.handleEvent = async function ({ api, event }) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    // Get user info for logging
    let senderName = "Unknown User";
    try {
        const userInfo = await api.getUserInfo(senderID);
        senderName = userInfo[senderID]?.name || "Unknown User";
    } catch (error) {
        console.error("Failed to get sender info:", error);
    }

    if (!mahiActive || !body) return;
    if (!messageReply || messageReply.senderID !== api.getCurrentUserID()) return;

    const userQuery = body.trim();

    // Log the user's message
    await logConversation({
        threadID,
        senderID,
        senderName,
        messageID,
        type: "user",
        content: userQuery
    });

    // ✅ Set to your own hosted Mahi API
    // IMPORTANT: This API needs to be capable of the desired responses (romantic, sexy, abusive).
    const apiURL = `https://jordan-amir-api.vercel.app/api/mahi?message=${encodeURIComponent(userQuery)}&name=Mahi&author=Mian%20Amir&senderID=${senderID}`;

    try {
        const res = await axios.get(apiURL);
        const reply = res.data?.reply || "⚠️ Mujhe abhi samajh nahi aaya, bolo na kya kehna chahte ho?";

        // Log Mahi's reply
        await logConversation({
            threadID,
            senderID: api.getCurrentUserID(), // Mahi's ID
            senderName: "Mahi", // Mahi's name
            messageID: null, // No specific message ID for AI's outgoing message yet
            type: "Mahi",
            content: reply
        });

        return api.sendMessage(reply, threadID, messageID);
    } catch (err) {
        console.error("API error:", err.message);
        const errorMessage = "❌ Uff! Mera dimaag thoda ghum gaya. Shayad network problem hai, ya shayad tum kuch aisa keh rahe ho jo main abhi process nahi kar pa rahi.";

        // Log the error message sent by the bot
        await logConversation({
            threadID,
            senderID: api.getCurrentUserID(),
            senderName: "Mahi",
            messageID: null,
            type: "Mahi_Error",
            content: errorMessage
        });
        return api.sendMessage(errorMessage, threadID, messageID);
    }
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const input = args[0]?.toLowerCase();

    switch (input) {
        case "on":
            mahiActive = true;
            return api.sendMessage("✅ Mahi AI ab tumhare liye hazir hai, kahin bhi aur kabhi bhi!", threadID, messageID);

        case "off":
            mahiActive = false;
            return api.sendMessage("❌ Mahi AI thodi der ke liye chup ho gayi hai. Jab bulaoge, phir aa jaungi.", threadID, messageID);

        case "status":
            if (mahiActive) {
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

/**
 * Logs conversation data to a JSON file.
 * Each thread will have its own JSON file.
 * @param {object} logData - The data to log (threadID, senderID, senderName, messageID, type, content).
 */
async function logConversation(logData) {
    const { threadID } = logData;
    const logFilePath = path.join(logDir, `${threadID}.json`);

    let conversationLog = [];
    try {
        const fileContent = await fs.readFile(logFilePath, 'utf8');
        conversationLog = JSON.parse(fileContent);
    } catch (error) {
        // File might not exist yet, or parsing failed. Start with an empty array.
        if (error.code !== 'ENOENT') { // ENOENT means file not found, which is fine
            console.error(`Error reading log file ${logFilePath}:`, error);
        }
    }

    conversationLog.push({
        timestamp: new Date().toISOString(),
        ...logData
    });

    try {
        await fs.writeFile(logFilePath, JSON.stringify(conversationLog, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing to log file ${logFilePath}:`, error);
    }
}
