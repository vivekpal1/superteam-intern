# Mai: Superteam Vietnam AI Assistant

A Telegram bot powered by local LLM to assist the Superteam Vietnam Web3 community.

## Features

- 🤖 AI-powered conversations using local LLM
- 👥 Group chat support with @mention functionality
- 📅 Event information and updates
- 🔍 Member search capabilities
- 🐦 Tweet generation assistance
- 💬 Natural language processing
- ⚡ Real-time responses

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm
- [Ollama](https://ollama.ai/) for local LLM support
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/superteam-vietnam-bot.git
cd superteam-vietnam-bot
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env` file in the root directory:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
CONNECTION_TIMEOUT=30000
MAX_RETRIES=3
```

4. Start the bot:
```bash
pnpm mai
```

## Usage

### Bot Commands

- `/start` - Initialize the bot
- `/help` - Show available commands
- `/find` - Search for community members
- `/tweet` - Generate tweet drafts
- `/events` - View upcoming events

### Group Chat Usage

1. Add the bot to your group
2. Mention the bot using @botname
3. The bot will respond to your query

### Private Chat Usage

Simply send messages directly to the bot.

## Development

### Project Structure

```
src/
├── agent/
│   ├── core/
│   │   ├── llm/         # LLM integration
│   │   └── rag/         # Vector store & retrieval
│   └── services/        # Core services
├── telegram/
│   └── bot/
│       ├── commands/    # Command handlers
│       ├── handlers/    # Message handlers
│       ├── middleware/  # Bot middleware
│       └── services/    # Bot services
└── index.ts            # Entry point
```

### Running Tests

```bash
pnpm test
```

### Building

```bash
pnpm build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Telegraf](https://github.com/telegraf/telegraf) for the Telegram Bot framework
- [Ollama](https://ollama.ai/) for local LLM support
- [Superteam Vietnam](https://vn.superteam.fun)

## Support

For support, join our [Telegram](https://t.me/solanainvietnam) or open an issue.
