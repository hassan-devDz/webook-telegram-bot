const { Markup } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const config = require("../../config");
const { generateReferralCode } = require("../../utils/helpers");

const prisma = new PrismaClient();

async function handleStart(ctx) {
  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || "";
    const name = ctx.from.first_name || "";
    const firstName = ctx.from.first_name;
    const lastName = ctx.from.last_name;
    const languageCode = ctx.from.language_code;

    // التحقق من وجود المستخدم
    let user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        subscriptions: {
          where: {
            isActive: true,
          },
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        referralRewards: {
          select: {
            amount: true,
          },
        },
        referredBy: true,
        referrals: true,
      },
    });
console.log("user",user);
    console.info(ctx);
    // معالجة الإحالة إذا وجدت
    const startPayload = ctx.payload;
    let referredById = null;
    if (startPayload && startPayload.startsWith("REF_") && !user) {
      const referralCode = startPayload//.replace("REF_", "");
      const referrer = await prisma.user.findFirst({
        where: { referralCode },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    if (!user) {
      // إنشاء مستخدم جديد
      user = await prisma.user.create({
        data: {
          telegramId,
          username,
          name,
          firstName,
          lastName: lastName || "",
          languageCode,
          balance: 0,
          referralCode: generateReferralCode(),
          referredById,
        },
      });

      // إرسال رسالة ترحيب
      await ctx.reply(
        `مرحباً بك ${firstName} في بوت الفعاليات! 🎉\n\n` +
          `رابط الإحالة الخاص بك:\n` +
          `https://t.me/${config.bot.username}?start=${user.referralCode}`,
        await getInitialKeyboard()
      );
    } else {
      // عرض معلومات المستخدم
      const subscriptionStatus = user.subscriptions.length > 0
        ? `✅ مشترك في باقة ${user.subscriptions.plan.name}\n` +
          `تنتهي في: ${config.time.format(user.subscriptions.endDate)}`
        : "❌ غير مشترك";

      const referralInfo =
        `👥 عدد الإحالات: ${user.referrals.length}\n` +
        `💰 رصيد الإحالات: ${user.referralRewards}`;

      await ctx.reply(
        `مرحباً بك مجدداً ${firstName}!\n\n` +
          `حالة الاشتراك:\n${subscriptionStatus}\n\n` +
          `${referralInfo}\n\n` +
          `رابط الإحالة الخاص بك:\n` +
          `https://t.me/${config.bot.username}?start=${user.referralCode}`,
        await getMainKeyboard(user)
      );
    }
  } catch (error) {
    console.error("Error in start command:", error);
    await ctx.reply("عذراً، حدث خطأ ما. الرجاء المحاولة مرة أخرى لاحقاً.");
  }
}

async function getInitialKeyboard() {
  const botSettings = await prisma.botSetting.findFirst();

  const buttons = [
    [
      Markup.button.callback("📋 الفعاليات المتاحة", "show_events"),
      Markup.button.callback("ℹ️ كيف يعمل البوت", "how_it_works"),
    ],
  ];

  if (botSettings?.allowDirectPayment) {
    buttons.push([Markup.button.callback("💳 اشترك الآن", "subscribe_direct")]);
  }

  if (botSettings?.allowCodePayment) {
    buttons.push([
      Markup.button.callback("🎟 تفعيل كود اشتراك", "activate_code"),
    ]);
  }

  return Markup.inlineKeyboard(buttons);
}

async function getMainKeyboard(user) {
  const buttons = [
    [
      Markup.button.callback("📋 الفعاليات المتاحة", "show_events"),
      Markup.button.callback("👤 حسابي", "my_account"),
    ],
  ];

  if (user.activeSubscription) {
    buttons.push([
      Markup.button.callback("📅 حجوزاتي", "my_bookings"),
      Markup.button.callback("⚙️ الإعدادات", "settings"),
    ]);
  } else {
    const botSettings = await prisma.botSetting.findFirst();

    if (botSettings?.allowDirectPayment) {
      buttons.push([
        Markup.button.callback("💳 اشترك الآن", "subscribe_direct"),
      ]);
    }

    if (botSettings?.allowCodePayment) {
      buttons.push([
        Markup.button.callback("🎟 تفعيل كود اشتراك", "activate_code"),
      ]);
    }
  }

  if (user.isAdmin) {
    buttons.push([Markup.button.callback("🔧 لوحة التحكم", "admin_panel")]);
  }

  return Markup.inlineKeyboard(buttons);
}

module.exports = handleStart;
