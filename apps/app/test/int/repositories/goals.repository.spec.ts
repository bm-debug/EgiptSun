import { describe, it, beforeAll, expect } from "bun:test";
import { getPlatformProxy } from "wrangler";
import { faker } from "@faker-js/faker";
import { GoalsRepository, ADMIN_TASK_TYPE } from "@/shared/repositories/goals.repository";
import { FinancesRepository } from "@/shared/repositories/finances.repository";
import { UsersRepository } from "@/shared/repositories/users.repository";
import { HumanRepository } from "@/shared/repositories/human.repository";
import { DealsRepository } from "@/shared/repositories/deals.repository";
import { generateAid } from "@/shared/generate-aid";
import { NewaltrpFinance, altrpFinance } from "@/shared/types/altrp-finance";
import { parseJson } from "@/shared/repositories/utils";
import type { AdminTaskDataIn } from "@/shared/types/tasks";
import type { CollectionGoalDataIn } from "@/shared/types/altrp-finance";

describe("GoalsRepository", () => {
    let db: D1Database;
    let goalsRepository: GoalsRepository;
    let financesRepository: FinancesRepository;
    let usersRepository: UsersRepository;
    let humanRepository: HumanRepository;
    let dealsRepository: DealsRepository;

    beforeAll(async () => {
        const platformProxy = await getPlatformProxy({
            configPath: "wrangler.test.toml",
        });

        db = platformProxy.env.DB as D1Database;
        goalsRepository = GoalsRepository.getInstance();
        financesRepository = FinancesRepository.getInstance();
        usersRepository = UsersRepository.getInstance();
        humanRepository = HumanRepository.getInstance();
        dealsRepository = DealsRepository.getInstance();
    });

    describe("createAdminTask", () => {
        it("создает админскую задачу с минимальными данными", async () => {
            const title = faker.lorem.sentence();
            const assigneeUuid = crypto.randomUUID();

            const task = await goalsRepository.createAdminTask({
                title,
                assigneeUuid,
            });

            expect(task).toBeDefined();
            expect(task.uuid).toBeDefined();
            expect(task.title).toBe(title);
            expect(task.type).toBe(ADMIN_TASK_TYPE);
            expect(task.statusName).toBe("TODO");
            expect(task.cycle).toBe("ONCE");
            expect(task.xaid).toBe(assigneeUuid);
            expect(task.order).toBe("0");

            const dataIn = parseJson<AdminTaskDataIn>(task.dataIn, {});
            expect(dataIn.assigneeUuid).toBe(assigneeUuid);
        });

        it("создает админскую задачу со всеми полями", async () => {
            const title = faker.lorem.sentence();
            const assigneeUuid = crypto.randomUUID();
            const assigneeName = faker.person.fullName();
            const assigneeAvatar = faker.image.avatar();
            const clientLink = `/admin/deals/deal-001`;
            const createdByUuid = crypto.randomUUID();
            const deadline = new Date().toISOString();
            const priority = "high" as const;
            const statusName = "IN_PROGRESS";

            const task = await goalsRepository.createAdminTask({
                title,
                statusName,
                priority,
                assigneeUuid,
                assigneeName,
                assigneeAvatar,
                clientLink,
                createdByHumanHaid: createdByUuid,
                deadline,
            });

            expect(task).toBeDefined();
            expect(task.title).toBe(title);
            expect(task.statusName).toBe(statusName);
            expect(task.type).toBe(ADMIN_TASK_TYPE);
            expect(task.xaid).toBe(assigneeUuid);

            const dataIn = parseJson<AdminTaskDataIn>(task.dataIn, {});
            expect(dataIn.priority).toBe(priority);
            expect(dataIn.assigneeUuid).toBe(assigneeUuid);
            expect(dataIn.assigneeName).toBe(assigneeName);
            expect(dataIn.assigneeAvatar).toBe(assigneeAvatar);
            expect(dataIn.clientLink).toBe(clientLink);
            expect(dataIn.createdByHumanHaid).toBe(createdByUuid);
            expect(dataIn.deadline).toBe(deadline);
        });

        it("автоматически генерирует gaid и fullGaid при создании", async () => {
            const title = faker.lorem.sentence();
            const assigneeUuid = crypto.randomUUID();

            const task = await goalsRepository.createAdminTask({
                title,
                assigneeUuid,
            });

            expect(task.gaid).toBeDefined();
            expect(task.gaid).toMatch(/^g-/);
            expect(task.fullGaid).toBeDefined();
            expect(task.fullGaid).toBe(task.gaid);
        });

        it("устанавливает статус по умолчанию TODO, если не указан", async () => {
            const title = faker.lorem.sentence();
            const assigneeUuid = crypto.randomUUID();

            const task = await goalsRepository.createAdminTask({
                title,
                assigneeUuid,
            });

            expect(task.statusName).toBe("TODO");
        });
    });

    describe("getAdminTasks", () => {
        it("возвращает все админские задачи без фильтров", async () => {
            const assigneeUuid1 = crypto.randomUUID();
            const assigneeUuid2 = crypto.randomUUID();

            const task1 = await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid: assigneeUuid1,
                statusName: "TODO",
            });

            const task2 = await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid: assigneeUuid2,
                statusName: "IN_PROGRESS",
            });

            const tasks = await goalsRepository.getAdminTasks();

            expect(tasks.length).toBeGreaterThanOrEqual(2);
            const taskUuids = tasks.map((t) => t.uuid);
            expect(taskUuids).toContain(task1.uuid);
            expect(taskUuids).toContain(task2.uuid);
        });

        it("фильтрует задачи по assigneeUuid", async () => {
            const assigneeUuid1 = crypto.randomUUID();
            const assigneeUuid2 = crypto.randomUUID();

            const task1 = await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid: assigneeUuid1,
            });

            await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid: assigneeUuid2,
            });

            const tasks = await goalsRepository.getAdminTasks({
                assigneeUuid: assigneeUuid1,
            });

            expect(tasks.length).toBeGreaterThanOrEqual(1);
            expect(tasks.every((t) => t.xaid === assigneeUuid1)).toBe(true);
            expect(tasks.some((t) => t.uuid === task1.uuid)).toBe(true);
        });

        it("фильтрует задачи по статусам", async () => {
            const assigneeUuid = crypto.randomUUID();

            const todoTask = await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid,
                statusName: "TODO",
            });

            const inProgressTask = await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid,
                statusName: "IN_PROGRESS",
            });

            await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid,
                statusName: "DONE",
            });

            const tasks = await goalsRepository.getAdminTasks({
                statuses: ["TODO", "IN_PROGRESS"],
            });

            expect(tasks.length).toBeGreaterThanOrEqual(2);
            const taskUuids = tasks.map((t) => t.uuid);
            expect(taskUuids).toContain(todoTask.uuid);
            expect(taskUuids).toContain(inProgressTask.uuid);
            expect(tasks.every((t) => ["TODO", "IN_PROGRESS"].includes(t.statusName || ""))).toBe(true);
        });

        it("комбинирует фильтры по assigneeUuid и статусам", async () => {
            const assigneeUuid1 = crypto.randomUUID();
            const assigneeUuid2 = crypto.randomUUID();

            const task1 = await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid: assigneeUuid1,
                statusName: "TODO",
            });

            await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid: assigneeUuid1,
                statusName: "DONE",
            });

            await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid: assigneeUuid2,
                statusName: "TODO",
            });

            const tasks = await goalsRepository.getAdminTasks({
                assigneeUuid: assigneeUuid1,
                statuses: ["TODO"],
            });

            expect(tasks.length).toBeGreaterThanOrEqual(1);
            expect(tasks.every((t) => t.xaid === assigneeUuid1 && t.statusName === "TODO")).toBe(true);
            expect(tasks.some((t) => t.uuid === task1.uuid)).toBe(true);
        });

        it("не возвращает удаленные задачи", async () => {
            const assigneeUuid = crypto.randomUUID();

            const task = await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid,
            });

            await goalsRepository.deleteByUuid(task.uuid, false);

            const tasks = await goalsRepository.getAdminTasks({
                assigneeUuid,
            });

            expect(tasks.every((t) => t.uuid !== task.uuid)).toBe(true);
        });

        it("сортирует задачи по updatedAt и createdAt в порядке убывания", async () => {
            const assigneeUuid = crypto.randomUUID();

            const task1 = await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid,
            });

            // Небольшая задержка для разницы во времени
            await new Promise((resolve) => setTimeout(resolve, 10));

            const task2 = await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid,
            });

            const tasks = await goalsRepository.getAdminTasks({
                assigneeUuid,
            });

            const task1Index = tasks.findIndex((t) => t.uuid === task1.uuid);
            const task2Index = tasks.findIndex((t) => t.uuid === task2.uuid);

            // task2 должен быть раньше task1, так как он создан позже
            expect(task2Index).toBeLessThan(task1Index);
        });
    });

    describe("findAdminTaskByUuid", () => {
        it("находит задачу по UUID", async () => {
            const assigneeUuid = crypto.randomUUID();
            const title = faker.lorem.sentence();

            const createdTask = await goalsRepository.createAdminTask({
                title,
                assigneeUuid,
            });

            const foundTask = await goalsRepository.findAdminTaskByUuid(createdTask.uuid);

            expect(foundTask).toBeDefined();
            expect(foundTask?.uuid).toBe(createdTask.uuid);
            expect(foundTask?.title).toBe(title);
            expect(foundTask?.type).toBe(ADMIN_TASK_TYPE);
        });

        it("возвращает null для несуществующей задачи", async () => {
            const nonExistentUuid = crypto.randomUUID();

            const foundTask = await goalsRepository.findAdminTaskByUuid(nonExistentUuid);

            expect(foundTask).toBeNull();
        });

        it("возвращает null для удаленной задачи", async () => {
            const assigneeUuid = crypto.randomUUID();
            const task = await goalsRepository.createAdminTask({
                title: faker.lorem.sentence(),
                assigneeUuid,
            });

            await goalsRepository.deleteByUuid(task.uuid, false);

            const foundTask = await goalsRepository.findAdminTaskByUuid(task.uuid);

            expect(foundTask).toBeNull();
        });

        it("не находит задачу другого типа", async () => {
            // Создаем задачу типа COLLECTION
            const finance = await createTestFinance();
            const collectionGoalData: CollectionGoalDataIn = {
                type: "CLIENT_CALL",
                stage: "CLIENT_CALL",
                priority: "MEDIUM",
                dealAid: "d-test",
                financeFaid: finance.faid,
                clientAid: null,
                overdueDays: 1,
                assigneeGroup: "COLLECTION",
                deadline: new Date().toISOString(),
                autoCreated: true,
            };

            const collectionGoal = await goalsRepository.createCollectionGoalFromFinance(finance, collectionGoalData);

            // Пытаемся найти её как админскую задачу
            const foundTask = await goalsRepository.findAdminTaskByUuid(collectionGoal.uuid);

            expect(foundTask).toBeNull();
        });
    });

    describe("createCollectionGoalFromFinance", () => {
        it("создает цель взыскания для просрочки 1-3 дня (CLIENT_CALL)", async () => {
            const finance = await createTestFinance();
            const overdueDays = 2;

            const goalData: CollectionGoalDataIn = {
                type: "CLIENT_CALL",
                stage: "CLIENT_CALL",
                priority: "MEDIUM",
                dealAid: "d-test",
                financeFaid: finance.faid,
                clientAid: null,
                overdueDays,
                assigneeGroup: "COLLECTION",
                deadline: new Date().toISOString(),
                autoCreated: true,
            };

            const goal = await goalsRepository.createCollectionGoalFromFinance(finance, goalData);

            expect(goal).toBeDefined();
            expect(goal.type).toBe("COLLECTION");
            expect(goal.statusName).toBe("TODO");
            expect(goal.title).toContain("Звонок клиенту");
            expect(goal.title).toContain("Просрочка: 2 дней");

            const dataIn = parseJson<CollectionGoalDataIn>(goal.dataIn, {} as CollectionGoalDataIn);
            expect(dataIn.type).toBe("CLIENT_CALL");
            expect(dataIn.stage).toBe("CLIENT_CALL");
            expect(dataIn.priority).toBe("MEDIUM");
            expect(dataIn.overdueDays).toBe(overdueDays);
        });

        it("создает цель взыскания для просрочки 4-5 дней (GUARANTOR_CALL)", async () => {
            const finance = await createTestFinance();
            const overdueDays = 4;

            const goalData: CollectionGoalDataIn = {
                type: "GUARANTOR_CALL",
                stage: "GUARANTOR_CALL",
                priority: "HIGH",
                dealAid: "d-test",
                financeFaid: finance.faid,
                clientAid: null,
                overdueDays,
                assigneeGroup: "COLLECTION",
                deadline: new Date().toISOString(),
                autoCreated: true,
            };

            const goal = await goalsRepository.createCollectionGoalFromFinance(finance, goalData);

            expect(goal).toBeDefined();
            expect(goal.title).toContain("Звонок поручителю");
            expect(goal.title).toContain("Просрочка: 4 дней");

            const dataIn = parseJson<CollectionGoalDataIn>(goal.dataIn, {} as CollectionGoalDataIn);
            expect(dataIn.type).toBe("GUARANTOR_CALL");
            expect(dataIn.stage).toBe("GUARANTOR_CALL");
            expect(dataIn.priority).toBe("HIGH");
        });

        it("создает цель взыскания для просрочки 6-10 дней (FIELD_VISIT)", async () => {
            const finance = await createTestFinance();
            const overdueDays = 7;

            const goalData: CollectionGoalDataIn = {
                type: "FIELD_VISIT",
                stage: "FIELD_VISIT",
                priority: "HIGH",
                dealAid: "d-test",
                financeFaid: finance.faid,
                clientAid: null,
                overdueDays,
                assigneeGroup: "COLLECTION",
                deadline: new Date().toISOString(),
                autoCreated: true,
            };

            const goal = await goalsRepository.createCollectionGoalFromFinance(finance, goalData);

            expect(goal).toBeDefined();
            expect(goal.title).toContain("Выезд СБ");
            expect(goal.title).toContain("Просрочка: 7 дней");

            const dataIn = parseJson<CollectionGoalDataIn>(goal.dataIn, {} as CollectionGoalDataIn);
            expect(dataIn.type).toBe("FIELD_VISIT");
            expect(dataIn.stage).toBe("FIELD_VISIT");
            expect(dataIn.priority).toBe("HIGH");
        });

        it("создает цель взыскания для просрочки более 10 дней (LEGAL_NOTICE)", async () => {
            const finance = await createTestFinance();
            const overdueDays = 15;

            const goalData: CollectionGoalDataIn = {
                type: "LEGAL_NOTICE",
                stage: "SECURITY_ESCALATION",
                priority: "CRITICAL",
                dealAid: "d-test",
                financeFaid: finance.faid,
                clientAid: null,
                overdueDays,
                assigneeGroup: "COLLECTION",
                deadline: new Date().toISOString(),
                autoCreated: true,
            };

            const goal = await goalsRepository.createCollectionGoalFromFinance(finance, goalData);

            expect(goal).toBeDefined();
            expect(goal.title).toContain("Юридическое уведомление");
            expect(goal.title).toContain("Просрочка: 15 дней");

            const dataIn = parseJson<CollectionGoalDataIn>(goal.dataIn, {} as CollectionGoalDataIn);
            expect(dataIn.type).toBe("LEGAL_NOTICE");
            expect(dataIn.stage).toBe("SECURITY_ESCALATION");
            expect(dataIn.priority).toBe("CRITICAL");
        });

        it("автоматически определяет тип цели на основе overdueDays, если не указан", async () => {
            const finance = await createTestFinance();
            const overdueDays = 8;

            const goalData = {
                dealAid: "d-test",
                financeFaid: finance.faid,
                clientAid: null,
                overdueDays,
                assigneeGroup: "COLLECTION",
                deadline: new Date().toISOString(),
                autoCreated: true,
            };

            const goal = await goalsRepository.createCollectionGoalFromFinance(finance, goalData);

            const dataIn = parseJson<CollectionGoalDataIn>(goal.dataIn, {} as CollectionGoalDataIn);
            // Для 8 дней должен быть FIELD_VISIT
            expect(dataIn.type).toBe("FIELD_VISIT");
            expect(dataIn.stage).toBe("FIELD_VISIT");
            expect(dataIn.priority).toBe("HIGH");
        });

        it("сохраняет все переданные данные в dataIn", async () => {
            const finance = await createTestFinance();
            const clientAid = "h-test-client";
            const relatedHumanAid = "h-test-related";
            const customInstructions = "Связаться с клиентом лично";
            const deadline = new Date(Date.now() + 86400000).toISOString();

            const goalData: CollectionGoalDataIn = {
                type: "CLIENT_CALL",
                stage: "CLIENT_CALL",
                priority: "MEDIUM",
                dealAid: "d-test",
                financeFaid: finance.faid,
                clientAid,
                overdueDays: 2,
                assigneeGroup: "COLLECTION",
                deadline,
                autoCreated: true,
                relatedHumanAid,
                instructions: customInstructions,
            };

            const goal = await goalsRepository.createCollectionGoalFromFinance(finance, goalData);

            const dataIn = parseJson<CollectionGoalDataIn>(goal.dataIn, {} as CollectionGoalDataIn);
            expect(dataIn.dealAid).toBe("d-test");
            expect(dataIn.financeFaid).toBe(finance.faid);
            expect(dataIn.clientAid).toBe(clientAid);
            expect(dataIn.relatedHumanAid).toBe(relatedHumanAid);
            expect(dataIn.instructions).toBe(customInstructions);
            expect(dataIn.deadline).toBe(deadline);
            expect(dataIn.assigneeGroup).toBe("COLLECTION");
            expect(dataIn.autoCreated).toBe(true);
        });

        it("использует clientAid из finance.dataIn, если не указан", async () => {
            const clientAid = "h-test-from-finance";
            const finance = await createTestFinance();
            // Обновляем finance.dataIn с clientAid
            await financesRepository.update(finance.uuid, {
                dataIn: {
                    ...(parseJson(finance.dataIn, {}) as any),
                    clientAid,
                },
            });

            // Получаем обновленный finance
            const updatedFinance = await financesRepository.findByUuid(finance.uuid);
            const altrpFinance: altrpFinance = {
                ...updatedFinance!,
                statusName: updatedFinance!.statusName as "OVERDUE",
                dataIn: parseJson(updatedFinance!.dataIn, finance.dataIn),
                dataOut: parseJson(updatedFinance!.dataOut, null),
            };

            const goalData: CollectionGoalDataIn = {
                type: "CLIENT_CALL",
                stage: "CLIENT_CALL",
                priority: "MEDIUM",
                dealAid: "d-test",
                financeFaid: finance.faid,
                clientAid: null, // Не указан явно
                overdueDays: 2,
                assigneeGroup: "COLLECTION",
                deadline: new Date().toISOString(),
                autoCreated: true,
            };

            const goal = await goalsRepository.createCollectionGoalFromFinance(altrpFinance, goalData);

            const dataIn = parseJson<CollectionGoalDataIn>(goal.dataIn, {} as CollectionGoalDataIn);
            expect(dataIn.clientAid).toBe(clientAid);
        });
    });

    // Helper function to create test finance
    async function createTestFinance(): Promise<altrpFinance> {
        const finance: NewaltrpFinance = {
            uuid: crypto.randomUUID(),
            faid: generateAid("f"),
            fullDaid: "d-test",
            statusName: "OVERDUE",
            dataIn: {
                paymentNumber: 1,
                paymentDate: new Date().toISOString().split("T")[0],
                totalAmount: 10000,
                principalAmount: 7000,
                profitShareAmount: 2500,
                serviceFeeAmount: 500,
                autoDebitEnabled: false,
                preferredPaymentChannel: "CARD",
                reminderScheduleDays: [7, 3, 1],
                dealAid: "d-test",
                clientAid: null,
                generatedBy: "SYSTEM",
            },
        };

        const created = await financesRepository.create(finance);
        return {
            ...created,
            statusName: created.statusName as "OVERDUE",
            dataIn: parseJson(created.dataIn, finance.dataIn),
            dataOut: parseJson(created.dataOut, null),
        } as altrpFinance;
    }
});

