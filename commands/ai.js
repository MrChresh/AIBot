import { SlashCommandBuilder } from 'discord.js';
import 'dotenv/config'
import http from 'node:http'

export default {
    data: new SlashCommandBuilder()
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
            .setDescription('The context size you want to use')
            .setMinValue(4096)
            .setMaxValue(128000)
            .setRequired(true))
        .addAttachmentOption((option) =>
            option
                .setName('text1')
                .setDescription('Attach text file (optional)')
                .setRequired(false))
        .addAttachmentOption((option) =>
            option
                .setName('text2')
                .setDescription('Attach text file (optional)')
                .setRequired(false))
        .addAttachmentOption((option) =>
            option
                .setName('text3')
                .setDescription('Attach text file (optional)')
                .setRequired(false))
        .addAttachmentOption((option) =>
            option
                .setName('text4')
                .setDescription('Attach text file (optional)')
                .setRequired(false))
        .addAttachmentOption((option) =>
            option
                .setName('text5')
                .setDescription('Attach text file (optional)')
                .setRequired(false)),
    execute: async (interaction) => {
        const client = interaction.client;
        if (!client.AIBot.allowedUsers.includes(interaction.user.id)) {
            return interaction.reply('You dont have access to this bot.');
        }
        const context = interaction.options.getNumber('context');
        const messageAuthor = interaction.user.id;
        const channel = interaction.channel;
        var prompt = interaction.options.getString('prompt');

        try {
            if (interaction.options.getAttachment('text1')?.url || interaction.options.getAttachment('text2')?.url || interaction.options.getAttachment('text3')?.url || interaction.options.getAttachment('text4')?.url || interaction.options.getAttachment('text5')?.url) {
                channel.send('Reading the file(s)! Fetching data...');
                let attachments = [interaction.options.getAttachment('text1'), interaction.options.getAttachment('text2'), interaction.options.getAttachment('text3'), interaction.options.getAttachment('text4'), interaction.options.getAttachment('text5')];
                for (let file of attachments) {
                    console.log(file);
                    // fetch the file from the external URL
                    if (file != null) {

                        const responseFile = await fetch(file?.url);

                        // if there was an error send a message with the status
                        if (!responseFile.ok) {
                            return channel.send(
                                'There was an error with fetching the file:',
                                responseFile.statusText,
                            );
                        }

                        const text = await responseFile.text();
                        //console.log(text);
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
            if (!client.AIBot.requests[messageAuthor]) {
                client.AIBot.requests[messageAuthor] = []
            }


            const postData = JSON.stringify({
                'model': process.env.OLLAMA_MODEL,
                'messages': messages,
                'think': process.env.OLLAMA_THINK.toLowerCase() === 'true',
                'stream': true,
                'options': {
                    'temperature': 0.2,
                    'top_p': 0.35,
                    'num_ctx': context,
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
                port: process.env.OLLAMA_PORT,
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
                                channel.send(messageContentThinking);
                                messageContentThinking = '';
                            }
                        }
                    }


                    if (messageContentThinking.length && content) {
                        channel.send(messageContentThinking);
                        messageContentThinking = '';
                        channel.send('**Content:**');
                    }

                    messageContent = messageContent + content;
                    if (messageContent.length > 1500) {
                        client.AIBot.Messages[messageAuthor][assistantsCurrentMessageID].content = client.AIBot.Messages[messageAuthor][assistantsCurrentMessageID].content + messageContent;
                        channel.send(messageContent);
                        messageContent = '';
                    }

                });
                res.on('end', () => {
                    console.log('No more data in response.');
                    channel.send(messageContent);
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

            client.AIBot.requests[messageAuthor].splice(requestId, requestId);

        } catch (e) {
            console.log(e);
        }
    }
};