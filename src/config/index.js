require("dotenv").config();
const { DateTime } = require("luxon");

const config = {
  // Bot Configuration
  bot: {
    token: process.env.BOT_TOKEN,
    username: process.env.BOT_USERNAME,
    options: {
      polling: true,
    },
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
  },

  // Application Configuration
  app: {
    env: process.env.NODE_ENV || "development",
    timezone: process.env.TZ || "UTC",
    adminId: process.env.ADMIN_TELEGRAM_ID,
    baseUrl: process.env.BASE_URL,
    port: process.env.PORT || 3000,
    debug: process.env.DEBUG === "true",
  },

  // API Configuration
  api: {
    url: process.env.API_URL,
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  },

  // Webook API Configuration
  weebook: {
    apiUrl: process.env.WEEBOOK_API_URL,
    timeout: 10000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "content-type": "application/json",
      Origin: "https://webook.com",
      DNT: "1",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
      TE: "trailers",
    },
  },
  // Intervals Configuration
  intervals: {
    eventFetch: 1000, // 1 second
    cleanup: 86400000, // 24 hours
  },

  // Payment Configuration
  payment: {
    successUrl: `${process.env.BOT_URL}?start=payment_success`,
    errorUrl: `${process.env.BOT_URL}?start=payment_error`,
    callbackUrl: `${process.env.API_URL}/api/payment/callback`,
    notificationUrl: `${process.env.API_URL}/api/payment/notification`,
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      secret: process.env.PAYPAL_SECRET,
    },
  },

  // MyFatoorah Configuration
  myfatoorah: {
    apiKey: process.env.MYFATOORAH_API_KEY,
    isTest: process.env.NODE_ENV !== "production",
    webhookSecret: process.env.MYFATOORAH_WEBHOOK_SECRET,
  },

  // Notification Configuration
  notifications: {
    fetchInterval: 1000, // 1 second
    batchSize: 100,
    channels: {
      telegram: true,
      email: false,
      sms: false,
    },
  },

  // Cache Configuration
  cache: {
    ttl: 60 * 60, // 1 hour
    checkPeriod: 60 * 60, // 1 hour
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Time Helpers
  time: {
    now() {
      return DateTime.now().setZone(config.app.timezone);
    },

    format(date, format = "yyyy-MM-dd HH:mm:ss") {
      return DateTime.fromJSDate(date)
        .setZone(config.app.timezone)
        .toFormat(format);
    },

    toDate(dateTime) {
      return DateTime.fromISO(dateTime).setZone(config.app.timezone).toJSDate();
    },

    addDays(date, days) {
      return DateTime.fromJSDate(date)
        .setZone(config.app.timezone)
        .plus({ days })
        .toJSDate();
    },

    addHours(date, hours) {
      return DateTime.fromJSDate(date)
        .setZone(config.app.timezone)
        .plus({ hours })
        .toJSDate();
    },

    isExpired(date) {
      return (
        DateTime.fromJSDate(date).setZone(config.app.timezone).diffNow()
          .milliseconds < 0
      );
    },
  },

  // Helper Functions
  isDevelopment() {
    return this.app.env === "development";
  },

  isProduction() {
    return this.app.env === "production";
  },

  isTest() {
    return this.app.env === "test";
  },
};

module.exports = config;
