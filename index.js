const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');

const TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || '1554951802703585280';
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID || '1554970513426743417';
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID || '1554963678099415072';
const VERIFICATION_MESSAGE_ID = process.env.VERIFICATION_MESSAGE_ID || '';

const VERIFY_EMOJI = '✅';
const VERIFY_MARKER = 'ONYX_ACCESS_PANEL_V1';

if (!TOKEN) {
  console.error('[ONYX] Missing DISCORD_BOT_TOKEN/BOT_TOKEN environment variable.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
  ],
});

function info(message) {
  console.log(`[ONYX] ${message}`);
}

async function resolveGuild() {
  if (GUILD_ID) {
    return client.guilds.fetch(GUILD_ID);
  }
  const guild = client.guilds.cache.first();
  if (!guild) throw new Error('No Discord server is available to this bot.');
  return guild;
}

async function resolveWelcomeChannel(guild) {
  if (WELCOME_CHANNEL_ID) {
    const ch = await guild.channels.fetch(WELCOME_CHANNEL_ID);
    if (!ch || !ch.isTextBased()) {
      throw new Error('WELCOME_CHANNEL_ID is not a text channel.');
    }
    return ch;
  }

  const channel = guild.channels.cache.find(
    (c) => c.isTextBased() && c.name.endsWith('・welcome')
  );
  if (!channel) {
    throw new Error('Could not find the Onyx welcome channel. Set WELCOME_CHANNEL_ID.');
  }
  return channel;
}

async function resolveVerifiedRole(guild) {
  if (VERIFIED_ROLE_ID) {
    const role = await guild.roles.fetch(VERIFIED_ROLE_ID);
    if (!role) throw new Error('VERIFIED_ROLE_ID was not found.');
    return role;
  }

  let role = guild.roles.cache.find((r) => !r.managed && r.name === '● verified');
  if (role) return role;

  // Fallback for a clean/empty server. This does not alter any channels.
  role = await guild.roles.create({
    name: '● verified',
    colors: { primaryColor: 0xB7B7B7 },
    hoist: true,
    mentionable: false,
    reason: 'Onyx access bot verification role',
  });

  info('Created missing ● verified role.');
  return role;
}

async function createOrFindVerificationMessage(channel) {
  if (VERIFICATION_MESSAGE_ID) {
    try {
      return await channel.messages.fetch(VERIFICATION_MESSAGE_ID);
    } catch (error) {
      info(`Configured verification message was not found: ${error.message}`);
    }
  }

  const recent = await channel.messages.fetch({ limit: 50 });
  const existing = recent.find(
    (message) =>
      message.author.id === client.user.id &&
      message.embeds.some((embed) =>
        typeof embed.description === 'string' &&
        embed.description.includes(VERIFY_MARKER)
      )
  );

  if (existing) {
    if (!existing.reactions.cache.has(VERIFY_EMOJI)) {
      await existing.react(VERIFY_EMOJI);
    }
    return existing;
  }

  const embed = new EmbedBuilder()
    .setColor(0x111111)
    .setTitle('ONYX ACCESS')
    .setDescription(
      `${VERIFY_MARKER}\n\n` +
      '**welcome to onyx hub.**\n\n' +
      'react with **✅** below to unlock the server and receive the `● verified` role.\n\n' +
      '`one reaction • instant access • no commands`'
    )
    .addFields(
      {
        name: 'before you continue',
        value: 'Please read the server rules first. By verifying, you agree to follow them.',
        inline: false,
      },
      {
        name: 'access',
        value: 'The `● verified` role unlocks the private access/key area.',
        inline: true,
      },
      {
        name: 'language',
        value: 'English + Русский',
        inline: true,
      },
    )
    .setFooter({ text: 'ONYX HUB • access system' });

  const message = await channel.send({
    embeds: [embed],
    allowedMentions: { parse: [] },
  });
  await message.react(VERIFY_EMOJI);
  info(`Created verification panel in #${channel.name} (message ${message.id}).`);
  info(`Set VERIFICATION_MESSAGE_ID=${message.id} after first launch if you want a hard lock.`);
  return message;
}

async function grantVerified(userId, guild, role) {
  const member = await guild.members.fetch(userId);
  if (member.user.bot) return;

  if (member.roles.cache.has(role.id)) {
    return;
  }

  const me = await guild.members.fetchMe();
  if (role.managed || role.position >= me.roles.highest.position) {
    throw new Error(
      `I cannot assign ${role.name}. Move the bot role ABOVE the verified role in Server Settings -> Roles.`
    );
  }

  await member.roles.add(role, 'Onyx reaction verification');
  info(`Verified ${member.user.tag} (${member.id}).`);
}

client.once('clientReady', async () => {
  try {
    const guild = await resolveGuild();
    await guild.roles.fetch();
    await guild.channels.fetch();

    const welcome = await resolveWelcomeChannel(guild);
    const verifiedRole = await resolveVerifiedRole(guild);
    const message = await createOrFindVerificationMessage(welcome);

    if (!message.reactions.cache.has(VERIFY_EMOJI)) {
      await message.react(VERIFY_EMOJI);
    }

    if (!welcome.permissionsFor(client.user.id)?.has(PermissionFlagsBits.SendMessages)) {
      throw new Error('The bot cannot send messages in the welcome channel.');
    }

    info(`ONLINE in ${guild.name}. Waiting for ✅ reactions.`);
    info(`Welcome channel: ${welcome.name}`);
    info(`Verified role: ${verifiedRole.name} (${verifiedRole.id})`);
    info(`Verification message: ${message.id}`);
  } catch (error) {
    console.error('[ONYX] Startup failed:', error);
    process.exit(1);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }

    if (reaction.emoji.name !== VERIFY_EMOJI) return;
    if (!reaction.message?.author || reaction.message.author.id !== client.user.id) return;

    const description = reaction.message.embeds?.[0]?.description || '';
    if (!description.includes(VERIFY_MARKER)) return;

    const guild = reaction.message.guild || await resolveGuild();
    const role = await resolveVerifiedRole(guild);
    await grantVerified(user.id, guild, role);
  } catch (error) {
    console.error(`[ONYX] Verification failed for ${user.id}:`, error.message);
  }
});

client.on('error', (error) => {
  console.error('[ONYX] Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[ONYX] Unhandled rejection:', error);
});

client.login(TOKEN).catch((error) => {
  console.error('[ONYX] Login failed:', error.message);
  process.exit(1);
});
