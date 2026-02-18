# Discord Bot for Ollama MCP Bridge

This Discord bot integrates with the [ollama-mcp-bridge](https://github.com/jonigl/ollama-mcp-bridge) to enable communication between Discord and Ollama models using the MCP (Model Communication Protocol) standard. The bot uses **index.js** as its main entry point.

![Discord Bot](https://img.shields.io/badge/Discord-Bot-7289DA?style=for-the-badge&logo=discord)

## Features

- Seamless integration with Ollama via MCP bridge
- May work directly with Ollama models (no bridge required)
- Simple environment configuration
- Supports Ollama models
- Discord command interface for model interactions
- Read text type files from attachments
- Response streaming (will send every 1500 characters)
- Allowed users via allowed_users.json to prevent abuse
- Chat history per user
- Cancel command

## Prerequisites

1. [Ollama](https://ollama.com/) installed and running
2. [ollama-mcp-bridge](https://github.com/jonigl/ollama-mcp-bridge) (optional for bridge integration)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/MrChresh/AIBot.git
   cd AIBot
   ```

2. Install dependencies:
   ```bash
   npm install  # or yarn install
   ```

3. Create a `.env` file in the root directory (see example below)

## Environment Configuration

### .env Example

```env
# Discord Bot Token (get from Discord Developer Portal)
DISCORD_TOKEN='your_discord_bot_token_here'

# Port to use (host IP is always '127.0.0.1')
OLLAMA_PORT=11000

# Ollama Model to use
OLLAMA_MODEL='qwen3:30b'

# Whether to enable the think parameter
OLLAMA_THINK=true

# Maximal settable context
MAX_CONTEXT=384000

# Set default context
DEFAULT_CONTEXT=93000
```

## Usage

Start the Discord bot:
```bash
node index.js
```
To enter a prompt:
```
/ai
```
To clear context/chat history:
```
/context
```
Experimental, to cancel request use:
```
/cancel
```

## Compatibility

This bot was developed specifically for the [ollama-mcp-bridge](https://github.com/jonigl/ollama-mcp-bridge), but it can also work directly with Ollama models. The host IP is always '127.0.0.1'.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.