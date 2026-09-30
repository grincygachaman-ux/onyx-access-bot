ONYX HUB — 24/7 REACTION VERIFICATION BOT
===========================================

WHAT THIS BOT DOES
------------------
This is a small 24/7 Discord bot for Onyx Hub.

It DOES NOT create, delete, rename, or move any channels.
It finds your existing welcome channel, posts ONE verification panel, adds a
✅ reaction, and waits for members to react.

When a human member reacts to that exact panel:
    -> the bot gives the ● verified role
    -> the member can see the private keys channel if its permissions use that role

No commands are required.

IMPORTANT DISCORD SETUP
------------------------
The bot must have:
- View Channels
- Send Messages
- Read Message History
- Add Reactions
- Manage Roles

The bot's highest role MUST be ABOVE `● verified` in Server Settings -> Roles.

If your existing bot invite did not include Manage Roles, re-invite it or update
its permissions before deployment.

INTENTS
-------
This bot only needs:
- Guilds
- Guild Message Reactions

Do NOT enable Message Content just for this bot.

BOTHOST
-------
Bothost currently supports Node.js bots and provides a Discord bot token environment
variable (`DISCORD_BOT_TOKEN`). It also supports adding environment variables in the
bot settings and recommends storing secrets there instead of hardcoding them.

Use these environment variables:

DISCORD_BOT_TOKEN = your Discord Bot Token
DISCORD_GUILD_ID = optional; defaults to the Onyx Hub server already configured
WELCOME_CHANNEL_ID = optional; defaults to the Onyx Hub welcome channel already configured
VERIFIED_ROLE_ID = optional; defaults to the existing `● verified` role already configured
VERIFICATION_MESSAGE_ID = optional; leave blank on the first run

RUN
---
Entry file:
  index.js

Start command:
  node index.js

If Bothost auto-detects Node.js entrypoints, index.js is detected automatically.

FIRST RUN
---------
1. Create a Bothost Discord bot and choose Node.js.
2. Upload the files or deploy from a Git repository.
3. Put the Discord token in Bothost's environment variables as DISCORD_BOT_TOKEN.
4. Add DISCORD_GUILD_ID with your server ID.
5. Start the bot.
6. It will find the existing `welcome` channel and post the verification panel.
7. Test with a normal user account: react with ✅.
8. The user should receive ● verified.

SECURITY
--------
Never put the Discord token into GitHub or inside index.js.
Use Bothost environment variables.
If the token is exposed, reset it immediately in Discord Developer Portal -> Bot.

BEHAVIOR
--------
- Reactions on unrelated messages are ignored.
- Bot users are ignored.
- The same user can react again safely; the role will not be duplicated.
- Removing the ✅ reaction does NOT remove the role. This is intentional: verification
  is a one-way access gate.
- The bot can stay online permanently on Bothost.

CHANNELS
--------
Existing channels are not modified.
The only channel-side action is sending the verification panel to the welcome channel
(and reacting to that message).

WHY THIS IS BETTER FOR 30K+ USERS
---------------------------------
The role assignment is automatic per reaction. You do not manually assign roles.
The bot listens over Discord Gateway and responds to each member reaction.
