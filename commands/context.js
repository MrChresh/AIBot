import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('context')
        .setDescription('Basically clear your personal chat history.'),
    execute: async (interaction) => {
        const client = interaction.client;
        if (!client.AIBot.allowedUsers.includes(interaction.user.id)) {
            return interaction.reply('You dont have access to this bot.');
        }

        const messageAuthor = interaction.user.id;
        const channel = interaction.channel;

        client.AIBot.Messages[messageAuthor] = null;
        return interaction.reply('Context has been cleared');
    }
}