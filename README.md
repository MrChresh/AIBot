This is a discord bot for using https://github.com/jonigl/ollama-mcp-bridge but it will probably work with Ollama [Ollama](https://ollama.com/) as well.

# Chresh AI Discord Bot

![Discord Bot](https://img.shields.io/badge/Discord-Bot-7289DA?style=for-the-badge&logo=discord)

A highly capable AI assistant bot for Discord with access control and file processing capabilities.

## Features

- **Access Control**: Only users listed in `allowed_users.json` can use the bot
- **Command System**: 
  - `?ai [prompt]`: Standard AI command (32k context)
  - `?aih [prompt]`: High-context AI command (128k context)
- **File Attachment Support**: Processes text from attached files automatically
- **Real-time Thinking & Content Streaming**: Shows AI's thought process before final response

## Requirements

- Node.js v16+ (ES modules support)
- Discord bot token (from [Discord Developer Portal](https://discord.com/developers/applications))
- [Ollama](https://ollama.com/) server running with Qwen3 model (127.0.0.1:11000)
- Discord.js v14+

## Setup

### 1. Install Dependencies
```bash
npm install discord.js dotenv fs http
```

### 2. Environment Configuration
Create `.env` file:
```env
DISCORD_TOKEN=your_discord_bot_token
```

### 3. Allowed Users Setup
Create `allowed_users.json` with your user IDs:
```json
{
  "allowedUsers": ["user_id_1", "user_id_2", "user_id_3"]
}
```

> **Note**: User IDs must be in Discord's numeric format (not display names)

### 4. Run the Bot
```bash
node bot.js
```

## Usage

### Basic Commands
```
?ai What is the capital of France?
```

```
?aih Explain quantum physics in simple terms.
```

### File Attachment
Attach atext file to your message with a command:
```
?aih Hello, here's a file.
```
The bot will automatically read the file content and include it in the prompt.

## Technical Details

- **Intents Required**: 
  - `Guilds`, `GuildMessages`, `MessageContent`, `GuildMembers`, `GuildVoiceStates`
- **AI API Endpoint**: `http://127.0.0.1:11000/api/chat`
- **Model Used**: `qwen3:30b`
- **Context Window**: 
  - Standard: 32,000 tokens
  - High-context: 128,000 tokens

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "You don't have access to this bot" | Verify your user ID is in `allowed_users.json` |
| API connection errors | Ensure Ollama server is running at `127.0.0.1:11000` |
| File attachment not working | Ensure file is text-based (not image/zip) |

> **Note**: The bot requires Discord application permissions for all required intents to function properly. Enable these in your Discord Developer Portal under "Bot" > "Privileged Intents".

---

*Chresh AI Bot - Fully autonomous, thorough, and designed to complete your requests without needing clarification.*