const { Telegraf } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const _ = require("lodash");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const bot = require("./bot");
// في ملف app.js أو حيث يتم بدء التطبيق
const eventService = require('./services/eventService');


// إنشاء Express app
const app = express();

// إنشاء instances
const prisma = new PrismaClient();
const telegramBot = new Telegraf(config.bot.token);

// Express middleware
app.use(cors(config.api.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
if (config.isProduction()) {
  const rateLimit = require("express-rate-limit");
  app.use(rateLimit(config.rateLimit));
}

// دمج منطق البوت
bot(telegramBot);

// تشغيل Express و Telegraf
const startServer = async () => {
  try {
    // اختبار الاتصال بقاعدة البيانات
    await prisma.$connect();
    console.log(`Database connected successfully [${config.app.env}]`);

    // تشغيل Express
    app.listen(config.app.port, () => {
      console.log(`API server running on port ${config.app.port}`);
      console.log(`Environment: ${config.app.env}`);
      console.log(`Timezone: ${config.app.timezone}`);
    });

    // تشغيل البوت

    console.log(
      `Telegram bot @${config.bot.username} started successfully`,
      "admin",
      config.app.adminId
    );

    if (config.app.adminId) {
      // إرسال إشعار للمشرف عند بدء التشغيل
      try {
        await telegramBot.telegram.sendMessage(
          config.app.adminId,
          `🚀 Bot restarted successfully\n` +
            `Environment: ${config.app.env}\n` +
            `Time: ${config.time.format(new Date())}`
        );
      } catch (error) {
        console.error(
          "Could not send startup notification to admin:",
          error.message
        );
      }
    }

    // معالجة الإغلاق بشكل نظيف
    const gracefulShutdown = async () => {
      console.log("Received shutdown signal");

      // إرسال إشعار للمشرف عند إيقاف التشغيل
      if (config.app.adminId) {
        try {
          await telegramBot.telegram.sendMessage(
            config.app.adminId,
            `🔄 Bot is shutting down\n` +
              `Time: ${config.time.format(new Date())}`
          );
        } catch (error) {
          console.error(
            "Could not send shutdown notification to admin:",
            error.message
          );
        }
      }

      await Promise.all([telegramBot.stop("SIGTERM"), prisma.$disconnect()]);

      process.exit(0);
    };
    // بدء خدمة الفعاليات
    await eventService.initialize();

    await telegramBot.launch();
    // تسجيل معالجات الإغلاق
    const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];
    signals.forEach((signal) => {
      process.once(signal, () => {
        console.log(`Received ${signal} signal`);
        gracefulShutdown();
      });
    });
  } catch (error) {
    console.error("Startup Error:", error);

    // إرسال إشعار للمشرف في حالة الخطأ
    if (config.app.adminId) {
      try {
        await telegramBot.telegram.sendMessage(
          config.app.adminId,
          `❌ Bot startup error\n` +
            `Error: ${error.message}\n` +
            `Time: ${config.time.format(new Date())}`
        );
      } catch (adminError) {
        console.error(
          "Could not send error notification to admin:",
          adminError.message
        );
      }
    }

    process.exit(1);
  }
};

// معالجة الأخطاء غير المتوقعة
process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception:", error);

  if (config.app.adminId) {
    try {
      await telegramBot.telegram.sendMessage(
        config.app.adminId,
        `⚠️ Uncaught Exception\n` +
          `Error: ${error.message}\n` +
          `Time: ${config.time.format(new Date())}`
      );
    } catch (adminError) {
      console.error(
        "Could not send error notification to admin:",
        adminError.message
      );
    }
  }

  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);

  if (config.app.adminId) {
    try {
      await telegramBot.telegram.sendMessage(
        config.app.adminId,
        `⚠️ Unhandled Promise Rejection\n` +
          `Reason: ${reason}\n` +
          `Time: ${config.time.format(new Date())}`
      );
    } catch (adminError) {
      console.error(
        "Could not send error notification to admin:",
        adminError.message
      );
    }
  }
});

startServer();
