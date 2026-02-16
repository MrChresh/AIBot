import { Client, Collection, Events, GatewayIntentBits, MessageFlags, REST, Routes } from 'discord.js';

import 'dotenv/config'
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import url from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.Guilds
    ]
});

client.commandsArr = [];
client.commands = new Map();

client.on('ready', async function () {
    console.log('Logged in as ' + client.user.tag);
    client.AIBot = {};
    try {
        const data = fs.readFileSync('allowed_users.json', 'utf8');
        console.log(JSON.parse(data));
        client.AIBot.allowedUsers = JSON.parse(data)['allowedUsers'];

    } catch (e) {
        console.error('Error loading allowed_users.json', e);
        client.AIBot.allowedUsers = [];
    }
    client.AIBot.Messages = [];
    client.AIBot.requests = [];

    // Grab all the command folders from the commands directory you created earlier
    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = [''];//fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        // Grab all the command files from the commands directory you created earlier
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
        // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = await import(url.pathToFileURL(filePath));
            if ('data' in command.default && 'execute' in command.default) {
                client.commandsArr.push(command.default.data.toJSON());
                client.commands.set(command.default.data.name, command.default);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    // and deploy your commands!

    try {
        console.log(`Started refreshing ${client.commandsArr.length} application (/) commands.`);

        const data = rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: client.commandsArr }
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
});


client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    //console.log(interaction.client.commands)
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.reply({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);