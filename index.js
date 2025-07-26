const { spawn } = require("child_process");
const axios = require("axios");
const logger = require("./utils/log");
const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const port = process.env.PORT || 21030; // Use hosting port or default to 21030

// Increase payload limits for better scalability
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Store active bot processes with better memory management
global.activeBots = new Map();

// Set higher limits for concurrent connections
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Serve the index.html file for the root route with fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            logger(`Error serving index.html: ${err.message}`, "[ERROR]");
            res.status(500).send('Unable to load the webpage. Check server logs.');
        }
    });
});

app.post('/start-bot', (req, res) => {
    const { appstate, adminUid, prefix, commands, events, botId, userId } = req.body;
    
    if (!botId) {
        return res.json({ status: "error", message: "Bot ID is required" });
    }

    if (global.activeBots.has(botId)) {
        return res.json({ status: "error", message: "Bot is already running" });
    }

    try {
        const baseConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const config = {
            ...baseConfig,
            appstate: appstate || baseConfig.appstate,
            ADMINBOT: adminUid ? [adminUid] : baseConfig.ADMINBOT,
            PREFIX: prefix || baseConfig.PREFIX,
            commands: commands || null,
            events: events || null,
            botId: botId
        };

        const configPath = path.resolve(`temp_config_${botId}.json`);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        logger(`Starting bot ${botId} with config: ${configPath}`, "[ BOT START ]");

        const child = spawn("node", ["--max-old-space-size=512", "--trace-warnings", "--async-stack-traces", "Priyansh.js"], {
            cwd: __dirname,
            stdio: ["pipe", "pipe", "pipe"],
            shell: true,
            detached: false,
            env: { 
                ...process.env, 
                BOT_CONFIG: configPath, 
                BOT_ID: botId,
                NODE_ENV: 'production'
            }
        });

        global.activeBots.set(botId, { 
            process: child, 
            startTime: new Date(), 
            configPath,
            userId: userId || 'unknown',
            config: config
        });

        let responseSet = false;

        const timeout = setTimeout(() => {
            if (!responseSet) {
                responseSet = true;
                res.json({ status: "success", message: "Bot starting..." });
            }
        }, 5000); // Increased timeout to 5 seconds

        child.stdout.on('data', (data) => {
            logger(`[BOT ${botId} OUTPUT]: ${data.toString()}`, "[INFO]");
        });

        child.stderr.on('data', (data) => {
            logger(`[BOT ${botId} ERROR]: ${data.toString()}`, "[ERROR]");
        });

        child.on("close", (codeExit) => {
            clearTimeout(timeout);
            logger(`Bot ${botId} closed with exit code: ${codeExit}`, "[ BOT CLOSE ]");
            global.activeBots.delete(botId);
            
            try {
                if (fs.existsSync(configPath)) {
                    fs.unlinkSync(configPath);
                }
            } catch (cleanupError) {
                logger(`Error cleaning up config file: ${cleanupError.message}`, "[ CLEANUP ERROR ]");
            }
            
            if (!responseSet) {
                responseSet = true;
                if (codeExit === 0) {
                    res.json({ status: "success", message: "Bot started successfully" });
                } else {
                    res.json({ status: "error", message: `Bot exited with code ${codeExit}. Check logs.` });
                }
            }
        });

        child.on("error", (error) => {
            clearTimeout(timeout);
            logger(`Bot ${botId} process error: ${error.message}`, "[ BOT ERROR ]");
            global.activeBots.delete(botId);
            
            try {
                if (fs.existsSync(configPath)) {
                    fs.unlinkSync(configPath);
                }
            } catch (cleanupError) {
                logger(`Error cleaning up config file: ${cleanupError.message}`, "[ CLEANUP ERROR ]");
            }
            
            if (!responseSet) {
                responseSet = true;
                res.json({ status: "error", message: `Process error: ${error.message}. Check logs.` });
            }
        });

        if (!responseSet) {
            responseSet = true;
            res.json({ status: "success", message: "Bot starting..." });
        }

    } catch (error) {
        logger(`Error starting bot ${botId}: ${error.message}`, "[ ERROR ]");
        res.json({ status: "error", message: `Failed to start bot: ${error.message}` });
    }
});

app.post('/stop-bot', (req, res) => {
    const { botId, userId } = req.body;
    const bot = global.activeBots.get(botId);
    
    if (bot && bot.userId !== userId && !req.query.admin) {
        return res.json({ status: "error", message: "You don't have permission to stop this bot" });
    }
    
    if (bot && bot.process) {
        try {
            bot.process.kill('SIGTERM');
            global.activeBots.delete(botId);
            
            if (bot.configPath && fs.existsSync(bot.configPath)) {
                fs.unlinkSync(bot.configPath);
            }
            
            logger(`Bot ${botId} stopped successfully`, "[ BOT STOP ]");
            res.json({ status: "success", message: "Bot stopped successfully" });
        } catch (error) {
            logger(`Error stopping bot ${botId}: ${error.message}`, "[ ERROR ]");
            res.json({ status: "error", message: `Error stopping bot: ${error.message}` });
        }
    } else {
        res.json({ status: "error", message: "Bot not found or already stopped" });
    }
});

app.get('/api/available-items', (req, res) => {
    try {
        const commandsPath = path.join(__dirname, 'Priyansh/commands');
        const eventsPath = path.join(__dirname, 'Priyansh/events');
        
        const commands = fs.readdirSync(commandsPath)
            .filter(file => file.endsWith('.js') && !file.includes('example'))
            .map(file => file.replace('.js', ''))
            .sort();
        
        const events = fs.readdirSync(eventsPath)
            .filter(file => file.endsWith('.js') && !file.includes('example'))
            .map(file => file.replace('.js', ''))
            .sort();
        
        res.json({ commands, events });
    } catch (error) {
        logger(`Error fetching available items: ${error.message}`, "[ ERROR ]");
        res.json({ commands: [], events: [] });
    }
});

app.get('/admin/all-bots', (req, res) => {
    const status = {};
    
    for (const [botId, bot] of global.activeBots) {
        const uptime = bot.startTime ? Math.floor((new Date() - bot.startTime) / 1000) : 0;
        status[botId] = { 
            running: bot.process && !bot.process.killed, 
            uptime: `${uptime}s`,
            pid: bot.process ? bot.process.pid : null,
            startTime: bot.startTime,
            userId: bot.userId,
            config: {
                prefix: bot.config?.PREFIX,
                adminUid: bot.config?.ADMINBOT,
                commands: bot.config?.commands,
                events: bot.config?.events
            }
        };
    }
    
    res.json({ totalBots: global.activeBots.size, bots: status });
});

app.get('/admin/download-appstate/:botId', (req, res) => {
    const { botId } = req.params;
    const bot = global.activeBots.get(botId);
    
    if (!bot || !bot.config) {
        return res.status(404).json({ error: 'Bot not found or no config available' });
    }
    
    try {
        let appstateData = typeof bot.config.appstate === 'string' ? bot.config.appstate : JSON.stringify(bot.config.appstate, null, 2);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="appstate_${botId}.json"`);
        
        res.send(appstateData);
        
        logger(`Admin downloaded appstate for bot ${botId}`, "[ ADMIN DOWNLOAD ]");
        
    } catch (error) {
        logger(`Error downloading appstate for bot ${botId}: ${error.message}`, "[ ERROR ]");
        res.status(500).json({ error: 'Failed to process appstate data' });
    }
});

app.get('/bot-status', (req, res) => {
    const { userId, admin } = req.query;
    const status = {};
    let count = 0;
    
    for (const [botId, bot] of global.activeBots) {
        if (admin === 'true' || bot.userId === userId) {
            const uptime = bot.startTime ? Math.floor((new Date() - bot.startTime) / 1000) : 0;
            status[botId] = { 
                running: bot.process && !bot.process.killed, 
                uptime: `${uptime}s`,
                pid: bot.process ? bot.process.pid : null,
                startTime: bot.startTime,
                userId: bot.userId
            };
            count++;
        }
    }
    res.json({ activeBotsCount: count, bots: status });
});

// Handle uncaught exceptions to prevent server crashes
process.on('uncaughtException', (error) => {
    logger(`Uncaught Exception: ${error.message}`, "[ CRITICAL ERROR ]");
    console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    logger(`Unhandled Rejection at: ${promise}, reason: ${reason}`, "[ CRITICAL ERROR ]");
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    logger('SIGTERM received, shutting down gracefully...', "[ SHUTDOWN ]");
    
    for (const [botId, bot] of global.activeBots) {
        try {
            if (bot.process && !bot.process.killed) {
                bot.process.kill('SIGTERM');
                logger(`Stopped bot ${botId} during shutdown`, "[ SHUTDOWN ]");
            }
        } catch (error) {
            logger(`Error stopping bot ${botId}: ${error.message}`, "[ SHUTDOWN ERROR ]");
        }
    }
    
    process.exit(0);
});

const server = app.listen(port, '0.0.0.0', () => {
    logger(`🚀 Server is running on port ${port}...`, "[ Starting ]");
    logger(`🌐 Server accessible at: http://0.0.0.0:${port}`, "[ Starting ]");
    logger(`👑 Owner: Mian Amir | WhatsApp: +923114397148`, "[ Starting ]");
}).on('error', (err) => {
    logger(`Server error: ${err.message}`, "[ Error ]");
    if (err.code === 'EADDRINUSE') {
        logger(`Port ${port} is already in use. Trying port ${port + 1}...`, "[ Error ]");
        server.listen(port + 1, '0.0.0.0');
    }
});

// Set server timeout for better handling of long requests
server.timeout = 300000; // 5 minutes
