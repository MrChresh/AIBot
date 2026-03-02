import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cancel')
        .setDescription('Cancels all your prompts.'),
    execute: async (interaction) => {
        const client = interaction.client;
        if (!client.AIBot.allowedUsers.includes(interaction.user.id)) {
            return interaction.reply('You dont have access to this bot.');
        }
        const messageAuthor = interaction.user.id;
        const channel = interaction.channel;

        if (!client.AIBot.requests[messageAuthor]) {
            client.AIBot.requests[messageAuthor] = [];
            return interaction.reply('No requests found.');
        }
        Object.keys(client.AIBot.requests[messageAuthor]).forEach(function (requestId) {
            client.AIBot.requests[messageAuthor][requestId].abort();
        })
        return await interaction.reply('All requests have been cancelled.');
    }
}