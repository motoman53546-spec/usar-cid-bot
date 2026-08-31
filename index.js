const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField, 
    ChannelType 
} = require('discord.js');
const express = require('express');

// Keep Railway service alive
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('USAR CID Security System Online.'));
app.listen(port, () => console.log(`CID Server running on port ${port}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Minimum account age threshold for suspicious account detection (7 Days)
const ACCOUNT_AGE_LIMIT_DAYS = 7; 

client.once('ready', () => {
    console.log(`[USAR CID] Logged in as ${client.user.tag}`);
    client.user.setActivity('USAR Security & Case Files', { type: 3 });
});

// AUTOMATED SUSPICIOUS ACCOUNT DETECTION
client.on('guildMemberAdd', async member => {
    const createdAt = member.user.createdAt;
    const now = new Date();
    const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);

    if (ageInDays < ACCOUNT_AGE_LIMIT_DAYS) {
        // Look for a designated security log channel
        const logChannel = member.guild.channels.cache.find(c => c.name === 'cid-security-logs');
        
        const alertEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🚨 SUSPICIOUS ACCOUNT DETECTED')
            .setDescription(`A newly created account joined the server. Potential alt/security risk.`)
            .addFields(
                { name: 'User', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                { name: 'Account Age', value: `${Math.floor(ageInDays)} days old`, inline: true },
                { name: 'Creation Date', value: createdAt.toUTCString(), inline: false }
            )
            .setTimestamp();

        if (logChannel) {
            logChannel.send({ embeds: [alertEmbed] });
        }
    }
});

// INTERACTION HANDLER (TICKETS & MODERATION)
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        // Create CID Ticket
        if (interaction.customId === 'create_cid_ticket') {
            const ticketName = `ticket-${interaction.user.username}`;
            
            // Check if ticket channel already exists
            const existingChannel = interaction.guild.channels.cache.find(c => c.name === ticketName);
            if (existingChannel) {
                return interaction.reply({ content: `You already have an open ticket: ${existingChannel}`, ephemeral: true });
            }

            // Create private ticket channel
            const channel = await interaction.guild.channels.create({
                name: ticketName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            const ticketEmbed = new EmbedBuilder()
                .setColor(0x002B49)
                .setTitle('USAR CID Ticket Center')
                .setDescription(`Welcome <@${interaction.user.id}>. Describe your incident or security inquiry in detail.\nAn agent will review your file shortly.`)
                .setTimestamp();

            const closeButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [ticketEmbed], components: [closeButton] });
            await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
        }

        // Close Ticket
        if (interaction.customId === 'close_ticket') {
            await interaction.reply('Closing ticket in 5 seconds...');
            setTimeout(() => interaction.channel.delete(), 5000);
        }
    }
});

// COMMAND LISTENER
client.on('messageCreate', async message => {
    if (message.author.bot || !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    // Send Ticket Setup Panel (!deploytickets)
    if (message.content === '!deploytickets') {
        const panelEmbed = new EmbedBuilder()
            .setColor(0x002B49)
            .setTitle('USAR Criminal Investigation Division | Help Desk')
            .setDescription('Click the button below to submit a security report, file an appeal, or request CID assistance.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_cid_ticket')
                .setLabel('Open Ticket')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [panelEmbed], components: [row] });
    }

    // Quick Warrant Generation (!warrant @user Reason)
    if (message.content.startsWith('!warrant')) {
        const args = message.content.split(' ').slice(1);
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'No reason specified';

        if (!target) return message.reply('Specify a target member: `!warrant @User <Reason>`');

        const warrantEmbed = new EmbedBuilder()
            .setColor(0xB22222)
            .setTitle('⚖️ OFFICIAL USAR CID WARRANT OF ARREST')
            .addFields(
                { name: 'Subject', value: `${target.user.tag} (<@${target.id}>)`, inline: true },
                { name: 'Issuing Authority', value: `${message.author.tag}`, inline: true },
                { name: 'Charges / Reason', value: reason, inline: false },
                { name: 'Status', value: 'ACTIVE - Authorized for MPC Execution', inline: false }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [warrantEmbed] });
    }
});

client.login(process.env.DISCORD_TOKEN);