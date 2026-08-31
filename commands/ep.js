const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ep-request')
        .setDescription('Request Executive Protection detail from CID/EPFO.')
        .addStringOption(option => option.setName('vip_name').setDescription('Name or Rank of VIP').setRequired(true))
        .addStringOption(option => option.setName('location').setDescription('Location/Server event area').setRequired(true))
        .addStringOption(option => option.setName('threat_level').setDescription('Low, Medium, or High').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const vipName = interaction.options.getString('vip_name');
        const location = interaction.options.getString('location');
        const threatLevel = interaction.options.getString('threat_level');
        const requester = interaction.user;

        const epRoleID = process.env.EP_AGENT_ROLE_ID; // Role ID to ping
        const epChannelID = process.env.EP_CHANNEL_ID; // Channel to post request

        const epEmbed = new EmbedBuilder()
            .setTitle('🛡️ EXECUTIVE PROTECTION REQUEST')
            .setColor(0x00FF00)
            .addFields(
                { name: 'Requester', value: `${requester}`, inline: true },
                { name: 'VIP Target', value: vipName, inline: true },
                { name: 'Threat Level', value: threatLevel, inline: true },
                { name: 'Location/Operation', value: location, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'EPFO Dispatch Grid' });

        // Safely fallback to the current channel if EP_CHANNEL_ID is not set in Railway yet
        let targetChannel = interaction.channel;
        if (epChannelID) {
            targetChannel = await interaction.client.channels.fetch(epChannelID).catch(() => interaction.channel);
        }

        const pingContent = epRoleID ? `<@&${epRoleID}> New protection detail requested!` : 'New protection request:';

        await targetChannel.send({
            content: pingContent,
            embeds: [epEmbed]
        });

        await interaction.editReply({ content: 'Your Executive Protection request has been transmitted to active agents.' });
    }
};