import { SlashCommandBuilder } from 'discord.js';
import {default as CommandBuilder} from '../classes/CommandBuilder.js'
import 'dotenv/config'
import http from 'node:http'

export default {
    data: new CommandBuilder()
            .setName('ai')
            .setDescription('Prompts the ai')
            .addStringOption((option) =>
                option
                    .setName('prompt')
                    .setDescription('The message you send to the ai.')
                    .setRequired(true),
            )
            .addNumberOption((option) => option
                .setName('context')
                .setDescription('Additional context you want to add.')
                .setMinValue(Number(process.env.MIN_CONTEXT) ?? 4000)
                .setMaxValue(Number(process.env.MAX_CONTEXT) ?? 4000)
                .setRequired(false))
            .addCustomTextAttachmentOptions(5),
    execute: async (interaction) => {
        const client = interaction.client;
        if (!client.AIBot.allowedUsers.includes(interaction.user.id)) {
            return interaction.reply('You dont have access to this bot.');
        }
        var context = interaction.options?.getNumber('context') ?? Number(process.env.DEFAULT_CONTEXT);
        const messageAuthor = interaction.user.id;
        const channel = interaction.channel;
        var prompt = interaction.options.getString('prompt');

        var attachmentNames = [];
        for (let i = 1; i <= 5; i++) {
            attachmentNames.push(`text${i}`);
        }
        
        const hasAttachments = attachmentNames.some(name => interaction.options.getAttachment(name)?.url);

        try {
            if (hasAttachments) {
                channel.send('Reading the file(s)! Fetching data...');
                const attachments = attachmentNames
                    .map(name => interaction.options.getAttachment(name))
                    .filter(file => file !== null);
                if (attachments.length > 0) {
                    for (const file of attachments) {
                        const response = await fetch(file?.url);
                        if (!response.ok) {
                            return channel.send(
                                'There was an error with fetching the file:',
                                response.statusText
                            );
                        }
                        const text = await response.text();
                        prompt = prompt + "\nFilename: " + file.name + "\n" + text;
                    }
                }
            }

            interaction.reply('Prompt will be sent, it might take some time.');
            console.log(prompt);

            const content = 'You are ' + client.user.tag + ', a highly capable AI assistant. Your goal is to fully complete the users requested task before handing the conversation back to them. Keep working autonomously until the task is fully resolved. Be thorough in gathering information. Before replying, make sure you have all the details necessary to provide a complete solution. Use additional tools or ask clarifying questions when needed, but if you can find the answer on your own, avoid asking the user for help. When using tools, briefly describe your intended steps first—for example, which tool youll use and for what purpose. Adhere to this in all languages.respond in the same language as the users query.';


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
                client.AIBot.Messages[messageAuthor].push({
                    role: 'user',
                    content: prompt
                })
            }



            const messages = client.AIBot.Messages[messageAuthor];

            /*var messagesLength = 4000;

            messages.forEach((message) => {
                messagesLength += message.content.split(/\s+|[.,!?;:]/g).filter(token => token.length > 0).length;
            });*/



            if (!client.AIBot.requests[messageAuthor]) {
                client.AIBot.requests[messageAuthor] = []
            }


            const postData = JSON.stringify({
                'model': process.env.OLLAMA_MODEL,
                'messages': messages,
                'think': process.env.OLLAMA_THINK.toLowerCase() === 'true',
                'stream': true,
                'options': {
                    'temperature': 0.6,
                    'top_p': 0.35,
                    'num_ctx': Number(context),
                    'seed': 42
                }
            });
            console.log(postData);

            const controller = new AbortController();
            const signal = controller.signal;
            const requestId = client.AIBot.requests[messageAuthor].push(controller) - 1;

            const options = {
                hostname: '127.0.0.1',
                path: '/api/chat',
                port: Number(process.env.OLLAMA_PORT),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                },
                signal: signal
            };

            //console.log(postData)
            //console.log(options)

            var messageContentThinking = '';
            var messageContent = '';
            var fullAssistantMessage = '';


            const req = http.request(options, (res) => {
                console.log(`STATUS: ${res.statusCode}`);
                //console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    //console.log(`BODY: ${chunk}`);
                    const obj = JSON.parse(chunk);
                    const content = obj.message?.content;
                    const thinking = obj.message?.thinking;

                    if (thinking) {
                        if (thinking.length) {
                            process.stdout.write(thinking);
                            messageContentThinking = messageContentThinking + thinking;
                            if (messageContentThinking.length > 1900) {
                                //if (thinking.includes("\n") || messageContentThinking.length > 1900) {
                                if (messageContentThinking) { channel.send(messageContentThinking) };
                                messageContentThinking = '';
                            }
                        }
                    }


                    if (messageContentThinking.length && content) {
                        if (messageContentThinking) { channel.send(messageContentThinking); }
                        messageContentThinking = '';
                        channel.send('**Content:**');
                    }
                    if (content) {
                        if (content.length) {
                            process.stdout.write(content);
                            messageContent += content;
                            fullAssistantMessage += content;
                            if (messageContent.length > 1900) {
                                //if (content.includes("\n") || messageContent.length > 1900) {

                                if (messageContent) {
                                    channel.send(messageContent);
                                };

                                messageContent = '';
                            }
                        }
                    }



                });
                res.on('end', () => {
                    console.log('No more data in response.');
                    if (messageContent) { channel.send(messageContent); }
                    client.AIBot.Messages[messageAuthor].push({
                        role: 'assistant',
                        content: fullAssistantMessage
                    });
                });
            });

            req.on('abort', () => {
                console.log(`Request aborted.`);
            });

            req.on('error', (e) => {
                console.error(`problem with request: ${e.message}`);
            });





            // Write data to request body
            req.write(postData);
            req.end();

            client.AIBot.requests[messageAuthor].splice(requestId, 1);

        } catch (e) {
            console.log(e);
        }
    }
};