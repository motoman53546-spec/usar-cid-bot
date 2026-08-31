const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warrant')
        .setDescription('Issue an official MPC/CID arrest warrant.')
        .addStringOption(option => option.setName('roblox_id').setDescription('Target Roblox User ID').setRequired(true))
        .addStringOption(option => option.setName('roblox_username').setDescription('Target Roblox Username').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for warrant').setRequired(true))
        .addAttachmentOption(option => option.setName('proof').setDescription('Optional proof screenshot').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const robloxId = interaction.options.getString('roblox_id');
        const robloxUsername = interaction.options.getString('roblox_username');
        const reason = interaction.options.getString('reason');
        const proof = interaction.options.getAttachment('proof');

        const embed = new EmbedBuilder()
            .setTitle('⚠️ ACTIVE MILITARY WARRANT')
            .setColor(0xFF0000)
            .addFields(
                { name: 'Suspect', value: robloxUsername, inline: true },
                { name: 'Roblox ID', value: robloxId, inline: true },
                { name: 'Issuer', value: `${interaction.user}`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        if (proof) embed.setImage(proof.url);

        // Push to Roblox Open Cloud MessagingService
        const universeId = process.env.ROBLOX_UNIVERSE_ID;
        const apiKey = process.env.ROBLOX_OPEN_CLOUD_API_KEY;

        if (universeId && apiKey) {
            try {
                await fetch(`https://apis.roblox.com/messaging-service/v1/universes/${universeId}/topics/WarrantUpdates`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey
                    },
                    body: JSON.stringify({
                        message: JSON.stringify({
                            action: 'add',
                            robloxId: robloxId,
                            robloxUsername: robloxUsername,
                            reason: reason
                        })
                    })
                });
            } catch (err) {
                console.error('Failed to sync warrant to Roblox Open Cloud:', err);
            }
        }

        const channel = await interaction.client.channels.fetch(process.env.WARRANT_CHANNEL_ID).catch(() => interaction.channel);
        await channel.send({ embeds: [embed] });
        await interaction.editReply({ content: `Warrant successfully issued for **${robloxUsername}** and broadcasted to the game server.` });
    }
};