import { describe, it, beforeAll, expect } from "bun:test";
import { getPlatformProxy } from "wrangler";
import { faker } from "@faker-js/faker";
import { NoticesRepository } from "@/shared/repositories/notices.repository";
import { DealsRepository } from "@/shared/repositories/deals.repository";
import { HumanRepository } from "@/shared/repositories/human.repository";
import { FinancesRepository } from "@/shared/repositories/finances.repository";
import { NoticeDataIn, MediaDataIn } from "@/shared/types/altrp-finance";
import { LoanApplicationDataIn } from "@/shared/types/altrp";

describe("NoticesRepository", () => {
  let db: D1Database;
  let noticesRepository: NoticesRepository;
  let dealsRepository: DealsRepository;
  let humanRepository: HumanRepository;
  let financesRepository: FinancesRepository;

  beforeAll(async () => {
    const platformProxy = await getPlatformProxy({
      configPath: "wrangler.test.toml",
    });

    db = platformProxy.env.DB as D1Database;
    noticesRepository = NoticesRepository.getInstance();
    dealsRepository = new DealsRepository();
    humanRepository = HumanRepository.getInstance();
    financesRepository = FinancesRepository.getInstance();
  });

  async function createDeal() {
    return dealsRepository.createLoanApplicationDealPublic({
      type: "LOAN_APPLICATION",
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number({ style: "international" }),
      email: faker.internet.email().toLowerCase(),
      productPrice: "100000",
      term: [12],
    } satisfies LoanApplicationDataIn);
  }

  describe("queuePaymentNotice", () => {
    it("создает напоминание о платеже", async () => {
      const { createdDeal } = await createDeal();

      const noticeData: NoticeDataIn = {
        channel: "EMAIL",
        templateKey: "payment_reminder_3_days",
        variables: [
          { key: "clientAid", value: createdDeal.clientAid as string },
          { key: "dealAid", value: createdDeal.daid },
          { key: "amount", value: 7500 },
          { key: "paymentDate", value: "2025-01-15" },
        ],
        relatedDealAid: createdDeal.daid,
        triggeredBy: "SYSTEM",
        triggerReason: "PAYMENT_REMINDER",
      };

      const notice = await noticesRepository.queuePaymentNotice(noticeData);
      expect(notice.typeName).toBe("PAYMENT_REMINDER");
      expect(notice.title).toContain("Напоминание");
    });

    it("создает уведомление о просрочке", async () => {
      const { createdDeal } = await createDeal();
      const notice = await noticesRepository.queuePaymentNotice({
        channel: "SMS",
        templateKey: "payment_overdue",
        variables: [
          { key: "clientAid", value: createdDeal.clientAid as string },
          { key: "dealAid", value: createdDeal.daid },
          { key: "amount", value: 9000 },
          { key: "overdueDays", value: 5 },
        ],
        relatedDealAid: createdDeal.daid,
        triggeredBy: "SYSTEM",
        triggerReason: "DEBT_COLLECTION",
      });

      expect(notice.typeName).toBe("DEBT_COLLECTION");
      expect(notice.title).toContain("Просрочка");
    });
  });

  describe("helper methods", () => {
    it("createPaymentReminder формирует корректные данные", async () => {
      const { createdDeal } = await createDeal();
      const finance = await financesRepository.create({
        uuid: crypto.randomUUID(),
        faid: `f-${faker.string.alphanumeric(6)}`,
        fullDaid: createdDeal.daid,
        title: "Test payment",
        sum: "7500",
        currencyId: "RUB",
        cycle: "MONTHLY",
        type: "INSTALLMENT",
        statusName: "PENDING",
        order: "1",
        dataIn: {
          paymentNumber: 1,
          paymentDate: new Date().toISOString().split("T")[0],
          totalAmount: 7500,
          principalAmount: 5250,
          profitShareAmount: 1875,
          autoDebitEnabled: false,
          preferredPaymentChannel: "CARD",
          reminderScheduleDays: [3, 1],
          dealAid: createdDeal.daid,
          clientAid: createdDeal.clientAid as string | null,
          generatedBy: "SYSTEM",
        },
        dataOut: {
          statusHistory: [],
        },
      } as any);

      const notice = await noticesRepository.createPaymentReminder(
        "SMS",
        createdDeal.clientAid as string,
        createdDeal.daid,
        finance.faid,
        7500,
        "2025-01-15",
        3,
      );

      const dataIn = typeof notice.dataIn === "string" ? JSON.parse(notice.dataIn) : notice.dataIn;
      expect(dataIn.templateKey).toBe("payment_reminder_3_days");
      expect(dataIn.triggerReason).toBe("PAYMENT_REMINDER");
    });

    it("createOverdueNotice формирует уведомление о просрочке", async () => {
      const { createdDeal } = await createDeal();
      const finance = await financesRepository.create({
        uuid: crypto.randomUUID(),
        faid: `f-${faker.string.alphanumeric(6)}`,
        fullDaid: createdDeal.daid,
        title: "Test payment",
        sum: "7500",
        currencyId: "RUB",
        cycle: "MONTHLY",
        type: "INSTALLMENT",
        statusName: "OVERDUE",
        order: "1",
        dataIn: {
          paymentNumber: 1,
          paymentDate: new Date().toISOString().split("T")[0],
          totalAmount: 7500,
          principalAmount: 5250,
          profitShareAmount: 1875,
          autoDebitEnabled: false,
          preferredPaymentChannel: "CARD",
          reminderScheduleDays: [3, 1],
          dealAid: createdDeal.daid,
          clientAid: createdDeal.clientAid as string | null,
          generatedBy: "SYSTEM",
        },
        dataOut: {
          statusHistory: [],
          overdueDays: 5,
        },
      } as any);

      const notice = await noticesRepository.createOverdueNotice(
        "EMAIL",
        createdDeal.clientAid as string,
        createdDeal.daid,
        finance.faid,
        7500,
        5,
      );

      const dataIn = typeof notice.dataIn === "string" ? JSON.parse(notice.dataIn) : notice.dataIn;
      expect(dataIn.templateKey).toBe("payment_overdue");
      expect(dataIn.triggerReason).toBe("DEBT_COLLECTION");
    });
  });
});
 