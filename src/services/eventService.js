const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const config = require("../config");
const notificationService = require("./notificationService");

const prisma = new PrismaClient();
// إضافة logger بسيط
const logger = {
  info: (message) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  error: (message, error) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error),
  debug: (message) =>
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`),
};
class EventService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: config.weebook.apiUrl,
      timeout: config.weebook.timeout,
      headers: config.weebook.headers,
    });
    this.isFirstRun = true;
  }

  async initialize() {
    try {
      // بدء عملية جلب الفعاليات
      await this.startFetchingEvents();
    } catch (error) {
      console.error("Error initializing EventService:", error);
    }
  }

  startFetchingEvents() {
    // استعلام فوري عند البداية
    this.fetchAndProcessEvents();

    // بدء الاستعلام الدوري كل دقيقة
    setInterval(() => {
      this.fetchAndProcessEvents();
    }, 60000); // 60 seconds
  }

  async fetchAndProcessEvents() {
    try {
      const { data } = await this.apiClient.post("", {
        query: `
                    query getEventListing($lang: String, $limit: Int, $skip: Int, $where: EventFilter, $order: [EventOrder]) {
                        eventCollection(locale: $lang, limit: $limit, skip: $skip, where: $where, order: $order) {
                            total
                            items {
      __typename
      sys {
        id
      }
      id
      title
      subtitle
      slug
      ticketingUrlSlug
      image11 {
        sys {
          id
          publishedAt
        }
        title
        url
        width
        height
        contentType
      }
      startingPrice
      currencyCode
      eventType
      schedule {
        openDateTime
        closeDateTime
      }
      zone {
        title
      }
      location {
        title
        city
      }
      category {
        id
        title
        slug
      }
    }
  }
}`,
        variables: {
          order: "sys_publishedAt_DESC",
          lang: "ar-SA",
          limit: this.isFirstRun ? 30 : 10, // 10 في أول مرة، 1 في المرات التالية
          where: {
            AND: [
              {
                OR: [{ location: {} }],
              },
            ],
            OR: [
              { schedule: { closeDateTime_exists: false } },
              {
                schedule: {
                  closeDateTime_gte: new Date().toISOString(),
                },
              },
            ],
            visibility_not: "private",
          },
        },
      });

      const events = data.data.eventCollection.items;

      if (events.length === 0) {
        console.log("No new events found");
        return;
      }
      // نعكس ترتيب المصفوفة لمعالجة الفعاليات الأقدم أولاً
      const reversedEvents = [...events].reverse();

      for (const event of reversedEvents) {
        const existingEvent = await prisma.event.findFirst({
          where: {
            AND: [
              // التأكد من تطابق المعرف الفريد من النظام
              {
                metadata: {
                  path: "$.sysId",
                  equals: event.sys?.id,
                },
              },
              // التأكد من تطابق معرف الفعالية
              {
                metadata: {
                  path: "$.id",
                  equals: event.id,
                },
              },
              // التأكد من تطابق العنوان
              { name: event.title },
              { publishedAt: new Date(event.image11?.sys?.publishedAt) },
              // التأكد من تطابق تاريخ البداية
              { startDate: new Date(event.schedule.openDateTime) },
              // التأكد من تطابق السعر
              {
                price: event.startingPrice
                  ? parseFloat(event.startingPrice)
                  : 0,
              },
             
              // التأكد من تطابق الرابط (slug)
              {
                metadata: {
                  path: "$.slug",
                  equals: event.slug,
                },
              },
              // التأكد من تطابق رمز العملة
              {
                metadata: {
                  path: "$.currencyCode",
                  equals: event.currencyCode,
                },
              },
              // التأكد من تطابق عنوان الموقع
              {
                metadata: {
                  path: "$.locationTitle",
                  equals: event.location?.title,
                },
              },
              {
                metadata: {
                  path: "$.imageSysId",
                  equals: event.image11?.sys?.id,
                },
              },
              // التأكد من تطابق نوع الحدث (إذا موجود)
              ...(event.eventType
                ? [
                    {
                      metadata: {
                        path: "$.eventType",
                        equals: event.eventType,
                      },
                    },
                  ]
                : []),

              // التأكد من تطابق عنوان الصورة (إذا موجود)
              ...(event.image11?.title
                ? [
                    {
                      metadata: {
                        path: "$.imageTitle",
                        equals: event.image11.title,
                      },
                    },
                  ]
                : []),
              // التأكد من تطابق رابط الصورة (إذا موجود)
              ...(event.image11?.url
                ? [
                    {
                      metadata: {
                        path: "$.imageUrl",
                        equals: event.image11.url,
                      },
                    },
                  ]
                : []),
              // يمكنك إضافة المزيد من الحقول هنا إذا كنتِ تريدين تضمينها
              // مثل slug أو currencyCode أو غيرها
            ],
          },
        });

        if (!existingEvent) {
          await this.processEvent(event);
          console.log(`Processed new event: ${event.title}`);
        } else {
          console.log(`Event already exists: ${event.title}`);
        }
      }

      // تحديث حالة أول تشغيل
      if (this.isFirstRun) {
        this.isFirstRun = false;
        console.log("First run completed, switching to regular polling");
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }

  async processEvent(eventData) {
    try {
          const city = eventData.location?.city || "غير معروف";
          const locationTitle = eventData.location?.title || "غير معروف";
      const eventToCreate = {
        name: eventData.title,
        description: eventData.subtitle || "",
        bookingLink: `https://webook.com/event/${eventData.ticketingUrlSlug}`,
        price: eventData.startingPrice
          ? parseFloat(eventData.startingPrice)
          : 0,
        availableTickets: 0,
        categoryId: await this.getOrCreateCategory(eventData.category),
        areaId: await this.getOrCreateArea(city),
        classificationId: await this.getOrCreateClassification(
          eventData.zone?.title
        ),
        startDate: new Date(eventData.schedule.openDateTime),
        endDate: new Date(eventData.schedule.closeDateTime),
        isPublished: true,
        publishedAt:new Date(eventData.image11?.sys?.publishedAt),
        metadata: {
          id: eventData.id,

          // إضافة الحقول الجديدة
          sysId: eventData.sys?.id,
          eventType: eventData.eventType,

          // معلومات الصورة
          imageUrl: eventData.image11?.url,
          imageTitle: eventData.image11?.title,
          imageSysId: eventData.image11?.sys?.id,

          currencyCode: eventData.currencyCode,
          slug: eventData.slug,
          locationTitle: locationTitle,
        },
      };

      const newEvent = await prisma.event.create({
        data: eventToCreate,
      });

      logger.info(`✨ New event created: ${newEvent.name}`);

      // إرسال إشعارات للمستخدمين المهتمين
      const interestedUsers = await this.findInterestedUsers(newEvent);
      if (interestedUsers.length > 0) {
        await notificationService.notifyUsersAboutEvent(
          newEvent,
          interestedUsers
        );
        logger.info(
          `🔔 Notified ${interestedUsers.length} users about event: ${newEvent.name}`
        );
      } else {
        logger.info(`ℹ️ No interested users found for event: ${newEvent.name}`);
      }
    } catch (error) {
      logger.error(`❌ Error processing event: ${eventData.title}`, error);
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

  async getOrCreateCategory(categoryData) {
    const category = await prisma.category.upsert({
      where: { name: categoryData.title },
      update: {},
      create: { name: categoryData.title },
    });
    return category.id;
  }

  async getOrCreateArea(cityName) {
    const area = await prisma.area.upsert({
      where: { name: cityName },
      update: {},
      create: { name: cityName },
    });
    return area.id;
  }

  async getOrCreateClassification(zoneName = "Default") {
    const classification = await prisma.classification.upsert({
      where: { name: zoneName },
      update: {},
      create: { name: zoneName },
    });
    return classification.id;
  }
}

// إنشاء نسخة واحدة من الخدمة
const eventService = new EventService();

// تصدير الخدمة
module.exports = eventService;
