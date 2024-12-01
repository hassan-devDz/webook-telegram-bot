const { Telegraf } = require("telegraf");
const handleStart = require("./commands/start");
// يمكن استيراد باقي المعالجات هنا

const initializeBot = (bot) => {
  // معالجات الأوامر الأساسية
  bot.command("start", handleStart);

  // معالجات أخرى
  bot.command("help", (ctx) => {
    return ctx.reply(`
الأوامر المتاحة:
/start - بدء استخدام البوت
/events - عرض الفعاليات المتاحة
/subscribe - إدارة الاشتراك
/profile - الملف الشخصي
/settings - الإعدادات
        `);
  });

  // معالجة النصوص
  bot.on("text", async (ctx) => {
    try {
      // يمكن إضافة معالجة النصوص هنا
    } catch (error) {
      console.error("Error handling text:", error);
      await ctx.reply("عذراً، حدث خطأ ما. الرجاء المحاولة مرة أخرى لاحقاً.");
    }
  });

  // معالجة الأزرار
  bot.on("callback_query", async (ctx) => {
    try {
      const callbackData = ctx.callbackQuery.data;
      // يمكن إضافة معالجة الأزرار هنا
    } catch (error) {
      console.error("Error handling callback:", error);
      await ctx
        .answerCbQuery("حدث خطأ ما. الرجاء المحاولة مرة أخرى.")
        .catch(() => {});
    }
  });

  // معالجة الأخطاء
  bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
  });
};

module.exports = initializeBot;
