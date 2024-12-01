/**
 * يقوم بإنشاء كود إحالة عشوائي
 * @param {number} length طول الكود (اختياري)
 * @returns {string} كود الإحالة
 */
function generateReferralCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "REF_";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * يقوم بتنسيق المبلغ المالي
 * @param {number} amount المبلغ
 * @param {string} currency العملة
 * @returns {string} المبلغ منسق
 */
function formatCurrency(amount, currency = "SAR") {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * يقوم بتنظيف النص من الأكواد الضارة
 * @param {string} text النص المراد تنظيفه
 * @returns {string} النص النظيف
 */
function sanitizeText(text) {
  return text.replace(/[<>&'"]/g, "");
}

/**
 * يقوم بتحويل التاريخ إلى نص بالعربية
 * @param {Date} date التاريخ
 * @returns {string} التاريخ بالعربية
 */
function formatDate(date) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(date).toLocaleDateString("ar-SA", options);
}

/**
 * يقوم بإنشاء معرف فريد للحجز
 * @returns {string} معرف الحجز
 */
function generateBookingReference() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `BK${timestamp}${random}`.toUpperCase();
}

/**
 * يقوم بتحقق من صحة رقم الهاتف
 * @param {string} phone رقم الهاتف
 * @returns {boolean} صحة الرقم
 */
function isValidPhone(phone) {
  const phoneRegex = /^(009665|9665|\+9665|05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
  return phoneRegex.test(phone);
}

/**
 * يقوم بتحقق من صحة البريد الإلكتروني
 * @param {string} email البريد الإلكتروني
 * @returns {boolean} صحة البريد
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * يقوم بتنسيق النص للعرض في تيليجرام
 * @param {string} text النص المراد تنسيقه
 * @returns {string} النص المنسق
 */
function formatTelegramText(text) {
  return text
    .replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&") // escape special characters
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = {
  generateReferralCode,
  formatCurrency,
  sanitizeText,
  formatDate,
  generateBookingReference,
  isValidPhone,
  isValidEmail,
  formatTelegramText,
};
