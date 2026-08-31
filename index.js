const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();
const commands = [];

// Load Slash Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        // FIXED: Store the whole command object so client.commands.get() returns the executable file
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
}

client.once('ready', async () => {
    console.log(`[SECURITY GRID] Logged in as ${client.user.tag}`);

    // Register Slash Commands with Discord
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('[SECURITY GRID] Slash commands registered successfully.');
    } catch (error) {
        console.error(error);
    }
});

// Suspicious Account Detection on Join
client.on('guildMemberAdd', async member => {
    const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
    const thresholdDays = 7; // Flags accounts created less than 7 days ago

    if (accountAgeDays < thresholdDays) {
        const logChannelId = process.env.MOD_LOG_CHANNEL_ID;
        if (!logChannelId) return;

        const logChannel = await member.guild.channels.fetch(logChannelId).catch(() => null);
        if (logChannel) {
            const alertEmbed = new EmbedBuilder()
                .setTitle('🚨 SUSPICIOUS ACCOUNT FLAGGED')
                .setColor(0xFFA500)
                .setDescription(`A new user joined with a recently created account.`)
                .addFields(
                    { name: 'User', value: `${member.user} (${member.user.tag})`, inline: true },
                    { name: 'Account Age', value: `${Math.floor(accountAgeDays)} days old`, inline: true },
                    { name: 'ID', value: member.id, inline: false }
                )
                .setTimestamp();
            logChannel.send({ embeds: [alertEmbed] });
        }
    }
});

// Dyno-Style Basic Auto-Mod (Anti-Spam / Phishing filter)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const content = message.content.toLowerCase();
    const badWords = ['discord.gg/', 't.me/', 'free robux']; // Add triggers here

    if (badWords.some(word => content.includes(word))) {
        try {
            await message.delete();
            const warning = await message.channel.send(`${message.author}, that link or phrase is restricted by the security protocol.`);
            setTimeout(() => warning.delete().catch(() => {}), 5000);
        } catch (err) {
            console.error('Auto-mod deletion failed:', err);
        }
    }
});

// FIXED: Handle Command Interactions so it actually runs your command files
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true }).catch(() => {});
        } else {
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);