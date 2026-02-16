import { GatewayIntentBits, Client } from 'discord.js';

import 'dotenv/config'
import fs from 'node:fs';
import http from 'node:http'

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.on('ready', function () {
    console.log('Logged in as ' + client.user.tag);
    client.AIBot = {};
    try {
        const data = fs.readFileSync('allowed_users.json', 'utf8');
        console.log(JSON.parse(data));
        client.AIBot.allowedUsers = JSON.parse(data)["allowedUsers"];

    } catch (e) {
        console.error('Error loading allowed_users.json', e);
        client.AIBot.allowedUsers = [];
    }
    client.AIBot.Messages = [];
});

const handleCommand = async (client, message) => {
    if (message.author.bot || !message.content.startsWith("?")) return;


    if (!client.AIBot.allowedUsers.includes(message.author.id)) {
        return message.channel.send('You dont have access to this bot.');
    }

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const messageAuthor = message.author.id;

    if (commandName == 'context') {
        client.AIBot.Messages[messageAuthor] = null;
        return message.channel.send('Context has been cleared');
    }
    if (commandName == 'aih') {
        var prompt = message.content.slice(4).trim();
    } else {
        var prompt = message.content.slice(3).trim();
    }
    const file = message.attachments.first()?.url;

    if (commandName == 'ai' || commandName == 'aih') {
        var context = 32000;
        if (commandName == 'aih') {
            context = 128000;
        }
        try {
            if (file) {
                message.channel.send('Reading the file(s)! Fetching data...');
                let attachments = message.attachments;
                for (let file of attachments) {
                    //console.log(file[1]);
                    // fetch the file from the external URL
                    const responseFile = await fetch(file[1]?.url);

                    // if there was an error send a message with the status
                    if (!responseFile.ok) {
                        return message.channel.send(
                            'There was an error with fetching the file:',
                            responseFile.statusText,
                        );
                    }

                    const text = await responseFile.text();
                    //console.log(text);
                    prompt = prompt + "\nFilename: " + file.name + "\n" + text;
                }

            }


            message.channel.send('Prompt will be sent, it might take some time.');
            console.log(prompt);

            const content = "You are " + client.user.tag + ", a highly capable AI assistant. Your goal is to fully complete the users requested task before handing the conversation back to them. Keep working autonomously until the task is fully resolved. Be thorough in gathering information. Before replying, make sure you have all the details necessary to provide a complete solution. Use additional tools or ask clarifying questions when needed, but if you can find the answer on your own, avoid asking the user for help. When using tools, briefly describe your intended steps first—for example, which tool youll use and for what purpose. Adhere to this in all languages.respond in the same language as the users query.";


            if (!client.AIBot.Messages[messageAuthor]) {
                client.AIBot.Messages[messageAuthor] = [
                    {
                        role: 'system',
                        content: content
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ];
            } else {
                client.AIBot.Messages[messageAuthor][client.AIBot.Messages[messageAuthor].length] = {
                    role: 'user',
                    content: prompt
                }
            }


            const assistantsCurrentMessageID = client.AIBot.Messages[messageAuthor].length;


            var messages = []
            client.AIBot.Messages[messageAuthor].forEach((message) => {
                messages.push(message);
            });
            client.AIBot.Messages[messageAuthor][assistantsCurrentMessageID] = {
                role: 'assistant',
                content: ''
            }


            const postData = JSON.stringify({
                "model": process.env.OLLAMA_MODEL,
                "messages": messages,
                "think": process.env.OLLAMA_THINK.toLowerCase() === 'true',
                "stream": true,
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.35,
                    "num_ctx": context,
                    "seed": 42
                }
            });
            console.log(postData);

            const options = {
                hostname: '127.0.0.1',
                path: '/api/chat',
                port: process.env.OLLAMA_PORT,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                },
            };

            //console.log(postData)
            //console.log(options)

            var messageContentThinking = '';
            var messageContent = '';

            const req = http.request(options, (res) => {
                console.log(`STATUS: ${res.statusCode}`);
                console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    //console.log(`BODY: ${chunk}`);
                    const obj = JSON.parse(chunk);
                    const content = obj.message?.content;
                    const thinking = obj.message?.thinking;

                    if (thinking) {
                        if (thinking.length) {
                            messageContentThinking = messageContentThinking + thinking;
                            if (messageContentThinking.length > 1500) {
                                message.channel.send(messageContentThinking);
                                messageContentThinking = '';
                            }
                        }
                    }


                    if (messageContentThinking.length && content) {
                        message.channel.send(messageContentThinking);
                        messageContentThinking = '';
                        message.channel.send("**Content:**");
                    }

                    messageContent = messageContent + content;
                    if (messageContent.length > 1500) {
                        client.AIBot.Messages[messageAuthor][assistantsCurrentMessageID].content = client.AIBot.Messages[messageAuthor][assistantsCurrentMessageID].content + messageContent;
                        message.channel.send(messageContent);
                        messageContent = '';
                    }

                });
                res.on('end', () => {
                    console.log('No more data in response.');
                    message.channel.send(messageContent);
                });
            });

            req.on('error', (e) => {
                console.error(`problem with request: ${e.message}`);
            });

            // Write data to request body
            req.write(postData);
            req.end();




            /*const thoughtText = response.data.message.thinking;
            const contentText = response.data.message.content;
 
            message.channel.send("**Thinking:**");
            for (var i = 0; i < Math.ceil(thoughtText.length / 2000); i++) {
                message.channel.send(thoughtText.slice(2000 * i, 2000 * i + 2000));
            }
            message.channel.send("**Content:**");
            for (var i = 0; i < Math.ceil(contentText.length / 2000); i++) {
                message.channel.send(contentText.slice(2000 * i, 2000 * i + 2000));
            }*/
        } catch (e) {
            console.log(e);
        }
    }
};


client.on("messageCreate", message => handleCommand(client, message));



client.login(process.env.DISCORD_TOKEN);