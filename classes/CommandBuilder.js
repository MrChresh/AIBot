import { SlashCommandBuilder } from 'discord.js';

export default class CommandBuilder extends SlashCommandBuilder {
    constructor(...args) {
        super(...args);
    }
    addCustomTextAttachmentOptions(count) {
        for (let i = 1; i <= count; i++) {
            this.addAttachmentOption((option) =>
                option.setName(`file${i}`).setDescription(`Attach a text or an image file (optional)`)
            )
        }
        return this;
    }
}