const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField, 
    ChannelType,
    REST,
    Routes,
    SlashCommandBuilder
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

// Slash Command Registration Data
const commands = [
    new SlashCommandBuilder()
        .setName('deploytickets')
        .setDescription('Deploys the CID Support and Ticket Creation Panel')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    new SlashCommandBuilder()
        .setName('warrant')
        .setDescription('Issues an official USAR CID Warrant of Arrest')
        .addUserOption(opt => opt.setName('target').setDescription('The suspect').setRequired(true))
        .addStringOption(opt => opt.setName('charges').setDescription('Reason/Charges for arrest').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
];

client.once('clientReady', async () => {
    console.log(`[USAR CID] Logged in as ${client.user.tag}`);
    client.user.setActivity('USAR Security & Case Files', { type: 3 });

    // Automatically register Slash Commands globally with Discord
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('[USAR CID] Slash commands registered successfully.');
    } catch (err) {
        console.error('[USAR CID] Error registering slash commands:', err);
    }
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

// INTERACTION HANDLER (SLASH COMMANDS & BUTTONS)
client.on('interactionCreate', async interaction => {
    // Handle Slash Commands
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'deploytickets') {
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

            await interaction.reply({ embeds: [panelEmbed], components: [row] });
        }

        if (interaction.commandName === 'warrant') {
            const target = interaction.options.getUser('target');
            const charges = interaction.options.getString('charges');

            const warrantEmbed = new EmbedBuilder()
                .setColor(0xB22222)
                .setTitle('⚖️ OFFICIAL USAR CID WARRANT OF ARREST')
                .addFields(
                    { name: 'Subject', value: `${target.tag} (<@${target.id}>)`, inline: true },
                    { name: 'Issuing Agent', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Charges', value: charges, inline: false },
                    { name: 'Status', value: 'ACTIVE - Authorized for MPC Execution', inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [warrantEmbed] });
        }
    }

    // Handle Button Clicks (Tickets)
    if (interaction.isButton()) {
        // Create CID Ticket
        if (interaction.customId === 'create_cid_ticket') {
            const ticketName = `ticket-${interaction.user.username}`;
            
            // Check if ticket channel already exists
            const existingChannel = interaction.guild.channels.cache.find(c => c.name === ticketName);
            if (existingChannel) {
                return interaction.reply({ content: `You already have an open ticket: ${existingChannel}`, flags: 64 });
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
            await interaction.reply({ content: `Ticket created: ${channel}`, flags: 64 });
        }

        // Close Ticket
        if (interaction.customId === 'close_ticket') {
            await interaction.reply('Closing ticket in 5 seconds...');
            setTimeout(() => interaction.channel.delete(), 5000);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);