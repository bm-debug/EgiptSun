import { describe, it, beforeAll, expect } from "bun:test";
import { getPlatformProxy } from "wrangler";
import { faker } from "@faker-js/faker";
import { HumanRepository } from "@/shared/repositories/human.repository";
import { Client, ClientStatus } from "@/shared/types/altrp";

describe("HumanRepository", () => {
    let db: D1Database;
    let humanRepository: HumanRepository;

    beforeAll(async () => {
        const platformProxy = await getPlatformProxy({
            configPath: "wrangler.test.toml",
        });

        db = platformProxy.env.DB as D1Database;
        humanRepository = HumanRepository.getInstance();
    });

    describe("generateClientByEmail", () => {
        it("создает нового клиента, если его нет по email", async () => {
            const email = faker.internet.email().toLowerCase();
            const additionalData = {
                fullName: faker.person.fullName(),
                dataIn: {
                    phone: faker.phone.number({ style: "international" }),
                },
            };

            const client = await humanRepository.generateClientByEmail(email, additionalData);

            expect(client).toBeDefined();
            expect(client.uuid).toBeDefined();
            expect(client.email).toBe(email);
            expect(client.haid).toBeDefined();
            expect(client.haid).toMatch(/^h-/);
            expect(client.statusName).toBe("PENDING");
            expect(client.type).toBe("CLIENT");
            expect(client.fullName).toBe(additionalData.fullName);
            expect(client.dataIn).toBeDefined();
            if (client.dataIn && typeof client.dataIn === "object" && "phone" in client.dataIn) {
                expect(client.dataIn.phone).toBe(additionalData.dataIn.phone);
            }
        });

        it("возвращает существующего клиента, если он уже есть по email", async () => {
            const email = faker.internet.email().toLowerCase();
            const initialData = {
                fullName: faker.person.fullName(),
                dataIn: {
                    phone: faker.phone.number({ style: "international" }),
                },
            };

            const firstClient = await humanRepository.generateClientByEmail(email, initialData);
            expect(firstClient).toBeDefined();
            expect(firstClient.email).toBe(email);

            const differentData = {
                fullName: faker.person.fullName(),
                dataIn: {
                    phone: faker.phone.number({ style: "international" }),
                },
            };

            const secondClient = await humanRepository.generateClientByEmail(email, differentData);

            expect(secondClient).toBeDefined();
            expect(secondClient.uuid).toBe(firstClient.uuid);
            expect(secondClient.haid).toBe(firstClient.haid);
            expect(secondClient.email).toBe(email);
            expect(secondClient.fullName).toBe(firstClient.fullName);
        });

        it("создает клиента с минимальными данными, если передан только email", async () => {
            const email = faker.internet.email().toLowerCase();

            const client = await humanRepository.generateClientByEmail(email, {});

            expect(client).toBeDefined();
            expect(client.email).toBe(email);
            expect(client.haid).toBeDefined();
            expect(client.haid).toMatch(/^h-/);
            expect(client.statusName).toBe("PENDING");
            expect(client.type).toBe("CLIENT");
            expect(client.fullName).toBe(email);
            expect(client.dataIn).toBeDefined();
        });

        it("применяет дополнительные данные при создании нового клиента", async () => {
            const email = faker.internet.email().toLowerCase();
            const phone = faker.phone.number({ style: "international" });
            const additionalData = {
                fullName: faker.person.fullName(),
                dataIn: {
                    phone: phone,
                },
            };

            const client = await humanRepository.generateClientByEmail(email, additionalData);

            expect(client).toBeDefined();
            expect(client.email).toBe(email);
            expect(client.fullName).toBe(additionalData.fullName);
            expect(client.dataIn).toBeDefined();
            if (client.dataIn && typeof client.dataIn === "object" && "phone" in client.dataIn) {
                expect(client.dataIn.phone).toBe(phone);
            }
        });

        it("генерирует уникальный haid для каждого нового клиента", async () => {
            const email1 = faker.internet.email().toLowerCase();
            const email2 = faker.internet.email().toLowerCase();

            const client1 = await humanRepository.generateClientByEmail(email1, { fullName: faker.person.fullName() });
            const client2 = await humanRepository.generateClientByEmail(email2, { fullName: faker.person.fullName() });

            expect(client1.haid).toBeDefined();
            expect(client2.haid).toBeDefined();
            expect(client1.haid).not.toBe(client2.haid);
            expect(client1.haid).toMatch(/^h-/);
            expect(client2.haid).toMatch(/^h-/);
        });
    });
});

