const logger = require("../utils/logger");
const config = require("../config");
const { PrismaClient } = require("@prisma/client");
const { Telegraf, Markup } = require("telegraf");
const e = require("express");

const prisma = new PrismaClient();
const bot = new Telegraf(config.bot.token);

class NotificationService {
  constructor() {
    this.queued = [];
    this.processing = false;
  }

  async notifyUsersAboutEvent(event) {
    try {
      const interestedUsers = await this.findInterestedUsers(event);
      logger.info(
        `Found ${interestedUsers.length} interested users for event: ${event.title}`
      );

      for (const user of interestedUsers) {
        this.queued.push({
          userId: user.telegramId,
          event,
          attempts: 0,
          type: "event",
        });
      }

      if (!this.processing) {
        await this.processQueue();
      }
    } catch (error) {
      logger.error("Error in notifyUsersAboutEvent:", error);
    }
  }

  async findInterestedUsers(event) {
    try {
      return await prisma.user.findMany({
        where: {
          AND: [{ isSubscribed: true }, { isBlocked: false }],
        },
        include: {
          preferences: {
            include: {
              categories: {
                where: {
                  categoryId: event.categoryId,
                },
              },
              areas: {
                where: {
                  areaId: event.areaId,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error("Error finding interested users:", error);
      return [];
    }
  }

  async processQueue() {
    if (this.processing || this.queued.length === 0) return;

    this.processing = true;
    const RATE_LIMIT_DELAY = 50; // 50ms between messages

    while (this.queued.length > 0) {
      const notification = this.queued.shift();

      try {
        switch (notification.type) {
          case "event":
            await this.sendEventNotification(notification);
            break;
          case "subscription":
            await this.sendSubscriptionNotification(notification);
            break;
          case "admin":
            await this.sendAdminNotification(notification);
            break;
        }
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      } catch (error) {
        logger.error(`Error processing notification:`, error);
        if (notification.attempts < 3) {
          this.queued.push({
            ...notification,
            attempts: notification.attempts + 1,
          });
        }
      }
    }

    this.processing = false;
  }

  async sendEventNotification({ userId, event, attempts }) {
    try {
      const { message, keyboard } = this.formatEventMessageWithImage(event);

      // إرسال الرسالة مع الصورة
      await bot.telegram.sendPhoto(userId, event.metadata.imageUrl, {
        caption: message,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });

      await this.logNotification({
        userId,
        eventId: event.id,
        type: "event",
        success: true,
      });
    } catch (error) {
      logger.error(
        `Error sending event notification to user ${userId}:`,
        error
      );
      await this.logNotification({
        userId,
        eventId: event.id,
        type: "event",
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  formatEventMessageWithImage(event) {
    // تنسيق التاريخ بشكل أفضل
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    // تنسيق الوقت والتاريخ
    const dateRange = startDate.toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const timeRange = `${startDate.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${endDate.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const message = `🎭 <b>${event.name}</b>

${event.description ? `💭 ${event.description}\n` : ""}
📅 <b>الموعد:</b> ${dateRange}
⏰ <b>الوقت:</b> ${timeRange}
📍 <b>المكان:</b> ${event.metadata.locationTitle}
💰 <b>السعر:</b> ${event.price} ${event.metadata.currencyCode}`.trim();

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🎟 احجز الآن",
            url: event.bookingLink,
          },
          {
            text: "🔗 رابط الفعالية",
            url: `https://webook.com/event/${event.metadata.slug}`,
          },
        ],
        [
          {
            text: "⭐️ أضف للمفضلة",
            callback_data: `favorite_${event.id}`,
          },
          {
            text: "🔔 ذكرني قبل الموعد",
            callback_data: `remind_${event.id}`,
          },
        ],
        [
          {
            text: "🔕 إيقاف إشعارات مشابهة",
            callback_data: `mute_category_${event.categoryId}`,
          },
        ],
      ],
    };

    return { message, keyboard };
  }

  async sendSubscriptionNotification(userId, type, data = {}) {
    const messages = {
      welcome: `🎉 مرحباً بك في خدمة إشعارات الفعاليات!\nسنقوم بإخطارك بكل جديد حسب اهتماماتك.`,
      renewal: `📅 تذكير: اشتراكك سينتهي في ${config.time.format(
        data.expiryDate
      )}\nللتجديد، اضغط على الزر أدناه.`,
      expired: `⚠️ انتهى اشتراكك. لتجديد الاشتراك والاستمرار في تلقي الإشعارات، اضغط على الزر أدناه.`,
      upgrade: `✨ فرصة للترقية! احصل على مميزات إضافية مع باقاتنا المميزة.`,
    };

    const keyboards = {
      welcome: Markup.inlineKeyboard([
        [Markup.button.callback("⚙️ إعداد تفضيلاتي", "setup_preferences")],
        [Markup.button.callback("📋 استعراض الفعاليات", "show_events")],
      ]),
      renewal: Markup.inlineKeyboard([
        [Markup.button.callback("💳 تجديد الاشتراك", "renew_subscription")],
        [Markup.button.callback("📋 تفاصيل الباقات", "show_plans")],
      ]),
      expired: Markup.inlineKeyboard([
        [Markup.button.callback("🔄 تجديد الاشتراك", "renew_subscription")],
        [Markup.button.callback("❓ لماذا أشترك؟", "subscription_benefits")],
      ]),
      upgrade: Markup.inlineKeyboard([
        [Markup.button.callback("⭐ ترقية الاشتراك", "upgrade_subscription")],
        [Markup.button.callback("📊 مقارنة الباقات", "compare_plans")],
      ]),
    };

    try {
      await bot.telegram.sendMessage(userId, messages[type], {
        parse_mode: "HTML",
        reply_markup: keyboards[type],
      });

      await this.logNotification({
        userId,
        type: "subscription",
        subType: type,
        success: true,
      });
    } catch (error) {
      logger.error(
        `Error sending subscription notification (${type}) to user ${userId}:`,
        error
      );
      await this.logNotification({
        userId,
        type: "subscription",
        subType: type,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async sendAdminNotification(message, type = "info") {
    if (!config.app.adminId) return;

    const icons = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    };

    try {
      await bot.telegram.sendMessage(
        config.app.adminId,
        `${icons[type]} ${message}\n\nالوقت: ${config.time.format(new Date())}`,
        { parse_mode: "HTML" }
      );
    } catch (error) {
      logger.error("Error sending admin notification:", error);
    }
  }

  async logNotification({
    userId,
    eventId = null,
    type,
    subType = null,
    success,
    errorMessage = null,
  }) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          eventId,
          type,
          subType,
          success,
          errorMessage,
          sentAt: config.time.now(),
        },
      });
    } catch (error) {
      logger.error("Error logging notification:", error);
    }
  }

  async getNotificationStats(userId) {
    try {
      const stats = await prisma.notification.groupBy({
        by: ["type", "success"],
        where: { userId },
        _count: true,
      });
      return stats;
    } catch (error) {
      logger.error("Error getting notification stats:", error);
      return [];
    }
  }
}

module.exports = new NotificationService();
