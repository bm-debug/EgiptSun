import { describe, it, beforeAll, expect, afterAll } from "bun:test";
import { TextsRepository } from "@/shared/repositories/texts.repository";
import { altrpTextDataIn } from "@/shared/types/altrp";

describe("TextsRepository", () => {
  let textsRepository: TextsRepository;
  let createdTextUuid: string | null = null;
  let createdTextTaid: string | null = null;
  let testSlug: string;

  beforeAll(async () => {
    textsRepository = TextsRepository.getInstance();
    testSlug = `test-slug-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  });

  afterAll(async () => {
    // Cleanup: удаляем созданную запись, если она еще существует
    if (createdTextUuid) {
      try {
        await textsRepository.deleteByUuid(createdTextUuid, true);
      } catch (error) {
        // Игнорируем ошибки при очистке
        console.warn("Failed to cleanup test text:", error);
      }
    }
  });

  describe("create blog post", () => {
    it("создает новую запись в блоге", async () => {
      const dataIn: altrpTextDataIn = {
        slug: testSlug,
        date: new Date().toISOString(),
        author: "Test Author",
        readTime: 5,
      };

      const textData = {
        title: "Test Blog Post",
        type: "BLOG",
        statusName: "DRAFT" as const,
        category: "test-category",
        content: "<p>Test content</p>",
        dataIn: dataIn,
        isPublic: true,
      };

      const created = await textsRepository.create(textData);

      expect(created).toBeDefined();
      expect(created.uuid).toBeDefined();
      expect(created.taid).toBeDefined();
      expect(created.title).toBe("Test Blog Post");
      expect(created.type).toBe("BLOG");
      expect(created.statusName).toBe("DRAFT");
      expect(created.category).toBe("test-category");
      expect(created.content).toBe("<p>Test content</p>");
      expect(created.taid).toMatch(/^t-/);
      expect(created.isPublic).toBe(true);

      // Сохраняем для последующих тестов
      createdTextUuid = created.uuid;
      createdTextTaid = created.taid || null;
    });
  });

  describe("findByTaid", () => {
    it("получает запись по taid", async () => {
      if (!createdTextTaid) {
        throw new Error("createdTextTaid is not set");
      }

      const found = await textsRepository.findByTaid(createdTextTaid);

      expect(found).toBeDefined();
      expect(found).not.toBeNull();
      if (found) {
        expect(found.uuid).toBe(createdTextUuid);
        expect(found.taid).toBe(createdTextTaid);
        expect(found.title).toBe("Test Blog Post");
        expect(found.type).toBe("BLOG");
      }
    });

    it("возвращает null для несуществующего taid", async () => {
      const found = await textsRepository.findByTaid("t-nonexistent-12345");

      expect(found).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("получает запись по slug", async () => {
      const found = await textsRepository.findBySlug(testSlug);

      expect(found).toBeDefined();
      expect(found).not.toBeNull();
      if (found) {
        expect(found.uuid).toBe(createdTextUuid);
        expect(found.taid).toBe(createdTextTaid);
        expect(found.title).toBe("Test Blog Post");
        expect(found.type).toBe("BLOG");

        // Проверяем, что dataIn содержит правильный slug
        if (found.dataIn) {
          let parsedDataIn: altrpTextDataIn | null = null;
          if (typeof found.dataIn === "string") {
            parsedDataIn = JSON.parse(found.dataIn) as altrpTextDataIn;
          } else {
            parsedDataIn = found.dataIn as altrpTextDataIn;
          }
          expect(parsedDataIn?.slug).toBe(testSlug);
        }
      }
    });

    it("возвращает null для несуществующего slug", async () => {
      const found = await textsRepository.findBySlug("nonexistent-slug-12345");

      expect(found).toBeNull();
    });
  });

  describe("delete blog post", () => {
    it("удаляет запись по uuid (soft delete)", async () => {
      if (!createdTextUuid) {
        throw new Error("createdTextUuid is not set");
      }

      await textsRepository.deleteByUuid(createdTextUuid, false);

      // Проверяем, что запись больше не находится через findByTaid
      const foundByTaid = await textsRepository.findByTaid(createdTextTaid!);
      expect(foundByTaid).toBeNull();

      // Проверяем, что запись больше не находится через findBySlug
      const foundBySlug = await textsRepository.findBySlug(testSlug);
      expect(foundBySlug).toBeNull();
    });

    it("после удаления запись не возвращается в списке", async () => {
      if (!createdTextTaid) {
        throw new Error("createdTextTaid is not set");
      }
      if (!createdTextUuid) {
        throw new Error("createdTextUuid is not set");
      }
      await textsRepository.deleteByUuid(createdTextUuid, false);

      // Проверяем через getFilteredBlog
      const result = await textsRepository.getFilteredBlog(
        { conditions: [] },
        { orders: [] },
        { page: 1, limit: 100 }
      );
      const foundInList = result.docs.find(
        (doc) => doc.uuid === createdTextUuid || doc.taid === createdTextTaid
      );

      expect(foundInList).toBeUndefined();
    });
  });

  describe("getFilteredBlog", () => {
    it("получает список записей блога с фильтрацией", async () => {
      // Создаем еще одну запись для теста
      const secondSlug = `test-slug-2-${Date.now()}`;
      const secondDataIn: altrpTextDataIn = {
        slug: secondSlug,
        date: new Date().toISOString(),
        author: "Test Author 2",
        readTime: 3,
      };

      const secondText = await textsRepository.create({
        title: "Second Test Blog Post",
        type: "BLOG",
        statusName: "PUBLISHED" as const,
        category: "test-category-2",
        content: "<p>Second test content</p>",
        dataIn: secondDataIn,
        isPublic: true,
      });

      try {
        const result = await textsRepository.getFilteredBlog(
          { conditions: [] },
          { orders: [] },
          { page: 1, limit: 100 }
        );

        expect(result).toBeDefined();
        expect(result.docs).toBeDefined();
        expect(Array.isArray(result.docs)).toBe(true);
        expect(result.pagination).toBeDefined();
        expect(result.pagination.total).toBeGreaterThanOrEqual(0);

        // Проверяем, что все записи имеют type BLOG
        result.docs.forEach((doc) => {
          expect(doc.type).toBe("BLOG");
        });

        // Проверяем, что вторая запись присутствует
        const foundSecond = result.docs.find((doc) => doc.uuid === secondText.uuid);
        expect(foundSecond).toBeDefined();
      } finally {
        // Очистка второй записи
        if (secondText.uuid) {
          try {
            await textsRepository.deleteByUuid(secondText.uuid, true);
          } catch (error) {
            console.warn("Failed to cleanup second test text:", error);
          }
        }
      }
    });
  });
});

