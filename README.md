# Webook Telegram Bot

Bot for tracking and notifying users about new events from Webook.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- Copy `.env.example` to `.env`
- Fill in your configuration values

3. Initialize database:
```bash
npm run db:push
npm run db:generate
```

4. Run the bot:
```bash
# Development
npm run dev

# Production
npm start
```

## Features

- Event tracking
- User notifications
- Subscription management
- Category preferences