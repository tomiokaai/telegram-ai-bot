# Telegram AI Bot

24/7 Telegram AI bot for Railway.

## Railway Variables
Set: `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `WEBHOOK_SECRET`. Optionally set `BOT_SYSTEM_PROMPT`.

Never commit secrets.

## Start
`npm start`

## Webhook
After Railway gives an HTTPS domain, set:
`https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<RAILWAY_DOMAIN>/telegram/<WEBHOOK_SECRET>`

The root endpoint returns JSON with `ok: true`.

Conversation history is in memory in this first version.
