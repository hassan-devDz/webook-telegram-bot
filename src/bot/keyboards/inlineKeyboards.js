const { Markup } = require("telegraf");

const mainMenuKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🎫 الفعاليات المتاحة", "events_list"),
      Markup.button.callback("📝 اشتراكاتي", "my_subscriptions"),
    ],
    [
      Markup.button.callback("⚙️ الإعدادات", "settings"),
      Markup.button.callback("📞 الدعم الفني", "support"),
    ],
  ]);
};

const eventsKeyboard = (events) => {
  const buttons = events.map((event) => [
    Markup.button.callback(
      `${event.title} - ${event.price} ${event.currencyCode}`,
      `event_${event.id}`
    ),
  ]);

  // إضافة أزرار التنقل
  buttons.push([
    Markup.button.callback("⬅️ السابق", "prev_events"),
    Markup.button.callback("القائمة الرئيسية 🏠", "main_menu"),
    Markup.button.callback("التالي ➡️", "next_events"),
  ]);

  return Markup.inlineKeyboard(buttons);
};

const eventDetailsKeyboard = (event) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.url("🎟 احجز الآن", event.ticketingUrl),
      Markup.button.callback("⭐ المفضلة", `favorite_${event.id}`),
    ],
    [
      Markup.button.callback("📅 تذكيرني قبل الفعالية", `remind_${event.id}`),
      Markup.button.callback(
        "🔔 إيقاف تنبيهات مشابهة",
        `mute_similar_${event.id}`
      ),
    ],
    [
      Markup.button.callback("🔙 عودة للفعاليات", "events_list"),
      Markup.button.callback("القائمة الرئيسية 🏠", "main_menu"),
    ],
  ]);
};

const settingsKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🎯 تفضيلات الفعاليات", "preferences"),
      Markup.button.callback("🔔 إعدادات التنبيهات", "notification_settings"),
    ],
    [
      Markup.button.callback("🗺 المناطق المفضلة", "favorite_areas"),
      Markup.button.callback("📋 الفئات المفضلة", "favorite_categories"),
    ],
    [Markup.button.callback("🔙 القائمة الرئيسية", "main_menu")],
  ]);
};

const preferencesKeyboard = (currentPreferences = {}) => {
  const categories = [
    ["رياضة", "sports"],
    ["ترفيه", "entertainment"],
    ["ثقافة", "culture"],
    ["تعليم", "education"],
  ];

  const buttons = categories.map(([name, value]) => [
    Markup.button.callback(
      `${currentPreferences[value] ? "✅" : "❌"} ${name}`,
      `toggle_category_${value}`
    ),
  ]);

  buttons.push([
    Markup.button.callback("💾 حفظ التفضيلات", "save_preferences"),
    Markup.button.callback("🔙 رجوع", "settings"),
  ]);

  return Markup.inlineKeyboard(buttons);
};

const subscriptionKeyboard = (isSubscribed = false) => {
  const buttons = [
    [Markup.button.callback("💳 الاشتراكات المتاحة", "subscription_plans")],
  ];

  if (isSubscribed) {
    buttons.unshift([
      Markup.button.callback("📊 تفاصيل اشتراكي", "subscription_details"),
      Markup.button.callback("🔄 تجديد الاشتراك", "subscription_renew"),
    ]);
  }

  buttons.push([Markup.button.callback("🔙 القائمة الرئيسية", "main_menu")]);

  return Markup.inlineKeyboard(buttons);
};

const supportKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📝 فتح تذكرة جديدة", "new_ticket"),
      Markup.button.callback("🎫 تذاكري السابقة", "my_tickets"),
    ],
    [
      Markup.button.callback("❓ الأسئلة الشائعة", "faq"),
      Markup.button.callback("📞 اتصل بنا", "contact_us"),
    ],
    [Markup.button.callback("🔙 القائمة الرئيسية", "main_menu")],
  ]);
};

const confirmationKeyboard = (actionId) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ نعم", `confirm_${actionId}`),
      Markup.button.callback("❌ لا", `cancel_${actionId}`),
    ],
  ]);
};

module.exports = {
  mainMenuKeyboard,
  eventsKeyboard,
  eventDetailsKeyboard,
  settingsKeyboard,
  preferencesKeyboard,
  subscriptionKeyboard,
  supportKeyboard,
  confirmationKeyboard,
};
