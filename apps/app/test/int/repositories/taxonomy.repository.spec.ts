import { describe, it, beforeAll, expect } from "bun:test";
import { getPlatformProxy } from "wrangler";

import { TaxonomyRepository } from "@/shared/repositories/taxonomy.repository";

describe("TaxonomyRepository", () => {
    let db: D1Database;
    let taxonomyRepository: TaxonomyRepository;

    beforeAll(async () => {
        const platformProxy = await getPlatformProxy({
            configPath: "wrangler.test.toml",
        });

        db = platformProxy.env.DB as D1Database;
        taxonomyRepository = new TaxonomyRepository();
    });

    describe("getTaxonomies", () => {
        it("получает список таксономий", async () => {
            const result = await taxonomyRepository.getTaxonomies({
                pagination: { page: 1, limit: 10 },
            });

            expect(result).toBeDefined();
            expect(result.docs).toBeDefined();
            expect(Array.isArray(result.docs)).toBe(true);
            expect(result.pagination).toBeDefined();
            expect(result.pagination.total).toBeGreaterThanOrEqual(0);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.limit).toBe(10);
        });

        it("получает один элемент по фильтрам из первого элемента и возвращает ошибку если ответ > 1", async () => {
            // Получаем список таксономий
            const listResult = await taxonomyRepository.getTaxonomies({
                pagination: { page: 1, limit: 10 },
            });

            expect(listResult.docs.length).toBeGreaterThan(0);

            // Берем первый элемент
            const firstItem = listResult.docs[0];
            expect(firstItem).toBeDefined();
            expect(firstItem.entity).toBeDefined();
            expect(firstItem.name).toBeDefined();

            // Получаем один элемент по фильтрам из первого элемента
            const filteredResult = await taxonomyRepository.getTaxonomies({
                filters: {
                    conditions: [
                        {
                            field: "entity",
                            operator: "eq",
                            values: [firstItem.entity],
                        },
                        {
                            field: "name",
                            operator: "eq",
                            values: [firstItem.name],
                        },
                    ],
                },
            });

            // Проверяем, что результат <= 1, иначе выбрасываем ошибку
            if (filteredResult.docs.length > 1) {
                throw new Error(
                    `Expected 1 or 0 results, but got ${filteredResult.docs.length} results for entity="${firstItem.entity}" and name="${firstItem.name}"`,
                );
            }

            expect(filteredResult.docs.length).toBe(1);
            console.log(filteredResult.docs[0].title, " === ", firstItem.title);

            // Если результат есть, проверяем, что это тот же элемент
            if (filteredResult.docs.length === 1) {
                expect(filteredResult.docs[0].id).toBe(firstItem.id);
                expect(filteredResult.docs[0].entity).toBe(firstItem.entity);
                expect(filteredResult.docs[0].name).toBe(firstItem.name);
            }
        });
    });
});

