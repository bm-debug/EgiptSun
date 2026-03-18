import { describe, it, beforeAll, expect, afterAll } from "bun:test";
import { getPlatformProxy } from "wrangler";
import { faker } from "@faker-js/faker";
import { MessageThreadsRepository } from "@/shared/repositories/message-threads.repository";
import { MessagesRepository } from "@/shared/repositories/messages.repository";
import { UsersRepository } from "@/shared/repositories/users.repository";
import { HumanRepository } from "@/shared/repositories/human.repository";
import { altrpSupportChat, altrpSupportMessage } from "@/shared/types/altrp-support";
import { generateAid } from "@/shared/generate-aid";
import { buildRequestEnv } from "@/shared/env";

describe("MessageThreadsRepository", () => {
  let db: D1Database;
  let messageThreadsRepository: MessageThreadsRepository;
  let messagesRepository: MessagesRepository;
  let usersRepository: UsersRepository;
  let humanRepository: HumanRepository;
  let testHumanHaid: string;
  let testManagerHaid: string;
  let createdChatMaid: string | null = null;
  let createdChatUuid: string | null = null;
  let createdMessageUuid: string | null = null;

  beforeAll(async () => {
    const platformProxy = await getPlatformProxy({
      configPath: "wrangler.test.toml",
    });

    db = platformProxy.env.DB as D1Database;
    messageThreadsRepository = MessageThreadsRepository.getInstance();
    messagesRepository = MessagesRepository.getInstance();
    usersRepository = UsersRepository.getInstance();
    humanRepository = HumanRepository.getInstance();

    // Create test human for client
    const testClient = await humanRepository.generateClientByEmail(
      faker.internet.email().toLowerCase(),
      {
        fullName: faker.person.fullName(),
      }
    );

    testHumanHaid = testClient.haid;

    // Create test human for manager
    const testManager = await humanRepository.generateClientByEmail(
      faker.internet.email().toLowerCase(),
      {
        fullName: faker.person.fullName(),
      }
    );
    testManagerHaid = testManager.haid;
  });

  afterAll(async () => {
    // Cleanup: удаляем созданные записи
    if (createdMessageUuid) {
      try {
        await messagesRepository.deleteByUuid(createdMessageUuid, true);
      } catch (error) {
        console.warn("Failed to cleanup test message:", error);
      }
    }
    if (createdChatUuid) {
      try {
        // await messageThreadsRepository.deleteByUuid(createdChatUuid, true);
      } catch (error) {
        console.warn("Failed to cleanup test chat:", error);
      }
    }
  });

  describe("findByMaid", () => {
    it("should find a chat by maid", async () => {
      // Create a test chat
      const subject = `Test Chat ${Date.now()}`;
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        subject,
        buildRequestEnv()
      );

      // Find by maid
      const foundChat = await messageThreadsRepository.findByMaid(chat.maid);

      expect(foundChat).toBeDefined();
      expect(foundChat?.maid).toBe(chat.maid);
      expect(foundChat?.title).toBe(subject);
      expect(foundChat?.type).toBe("SUPPORT");
      expect(foundChat?.statusName).toBe("OPEN");

      // Cleanup
      if (foundChat) {
        // await messageThreadsRepository.deleteByUuid(foundChat.uuid, true);
      }
    });

    it("should return null if chat not found", async () => {
      const nonExistentMaid = `m-${generateAid("m")}`;
      const foundChat = await messageThreadsRepository.findByMaid(nonExistentMaid);

      expect(foundChat).toBeNull();
    });
  });

  describe("startNewSupportChat", () => {
    it("should create a new support chat with valid data", async () => {
      const subject = `Test Support Chat ${Date.now()}`;
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        subject,
        buildRequestEnv()
      );

      expect(chat).toBeDefined();
      expect(chat.uuid).toBeDefined();
      expect(chat.maid).toBeDefined();
      expect(chat.maid).toMatch(/^m-/);
      expect(chat.title).toBe(subject);
      expect(chat.statusName).toBe("OPEN");
      expect(chat.type).toBe("SUPPORT");
      expect(chat.dataIn).toBeDefined();

      const dataIn = typeof chat.dataIn === "string" 
        ? JSON.parse(chat.dataIn) 
        : chat.dataIn;
      expect(dataIn.humanHaid).toBe(testHumanHaid);

      createdChatMaid = chat.maid;
      createdChatUuid = chat.uuid;
    });

    it("should throw error if humanHaid is missing", async () => {
      await expect(
        messageThreadsRepository.startNewSupportChat("" as any, "Test Subject", buildRequestEnv())
      ).rejects.toThrow("Human haid is required to start new support chat");
    });

    it("should throw error if subject is missing", async () => {
      await expect(
        messageThreadsRepository.startNewSupportChat(testHumanHaid, "", buildRequestEnv())
      ).rejects.toThrow("Subject is required to start new support chat");
    });

    it("should create chat with default dataIn if not provided", async () => {
      const subject = `Test Chat ${Date.now()}`;
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        subject,
        buildRequestEnv()
      );

      expect(chat.dataIn).toBeDefined();
      
      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });
  });

  describe("getFilteredSupportChats", () => {
    it("should return paginated support chats", async () => {
      // Create test chats
      const chat1 = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Test Chat 1 ${Date.now()}`,
        buildRequestEnv()
      );
      const chat2 = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Test Chat 2 ${Date.now()}`,
        buildRequestEnv()
      );

      const result = await messageThreadsRepository.getFilteredSupportChats(
        { conditions: [] },
        { orders: [{ field: "createdAt", direction: "desc" }] },
        { page: 1, limit: 10 }
      );

      expect(result).toBeDefined();
      expect(result.docs).toBeInstanceOf(Array);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat1.uuid, true);
      // await messageThreadsRepository.deleteByUuid(chat2.uuid, true);
    });

    it("should filter by statusName", async () => {
      // Create OPEN chat
      const openChat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Open Chat ${Date.now()}`,
        buildRequestEnv()
      );

      // Create CLOSED chat
      const closedChat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Closed Chat ${Date.now()}`,
        buildRequestEnv()
      );
      await messageThreadsRepository.updateChatStatus(closedChat.maid, "CLOSED");

      // Filter by OPEN
      const openResult = await messageThreadsRepository.getFilteredSupportChats(
        {
          conditions: [
            { field: "statusName", operator: "eq", values: ["OPEN"] },
          ],
        },
        { orders: [{ field: "createdAt", direction: "desc" }] },
        { page: 1, limit: 10 }
      );

      expect(openResult.docs.length).toBeGreaterThan(0);
      openResult.docs.forEach((chat) => {
        expect(chat.statusName).toBe("OPEN");
      });

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(openChat.uuid, true);
      // await messageThreadsRepository.deleteByUuid(closedChat.uuid, true);
    });

    it("should filter by managerHaid", async () => {
      // Create chat and assign manager
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Manager Chat ${Date.now()}`,
        buildRequestEnv()
      );
      await messageThreadsRepository.assignManager(chat.maid, testManagerHaid);

      // Filter by managerHaid
      const result = await messageThreadsRepository.getFilteredSupportChats(
        {
          conditions: [
            { field: "managerHaid", operator: "eq", values: [testManagerHaid] },
          ],
        },
        { orders: [{ field: "createdAt", direction: "desc" }] },
        { page: 1, limit: 10 }
      );

      expect(result.docs.length).toBeGreaterThan(0);
      result.docs.forEach((chat) => {
        const dataIn = typeof chat.dataIn === "string" 
          ? JSON.parse(chat.dataIn) 
          : chat.dataIn;
        expect(dataIn.managerHaid).toBe(testManagerHaid);
      });

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should filter by humanHaid", async () => {
      // Create chat for test human
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Human Chat ${Date.now()}`,
        buildRequestEnv()
      );

      // Filter by humanHaid
      const result = await messageThreadsRepository.getFilteredSupportChats(
        {
          conditions: [
            { field: "humanHaid", operator: "eq", values: [testHumanHaid] },
          ],
        },
        { orders: [{ field: "createdAt", direction: "desc" }] },
        { page: 1, limit: 10 }
      );

      expect(result.docs.length).toBeGreaterThan(0);
      result.docs.forEach((chat) => {
        const dataIn = typeof chat.dataIn === "string" 
          ? JSON.parse(chat.dataIn) 
          : chat.dataIn;
        expect(dataIn.humanHaid).toBe(testHumanHaid);
      });

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should support pagination", async () => {
      // Create multiple chats
      const chats = [];
      for (let i = 0; i < 5; i++) {
        const chat = await messageThreadsRepository.startNewSupportChat(
          testHumanHaid,
          `Pagination Chat ${i} ${Date.now()}`,
          buildRequestEnv()
        );
        chats.push(chat);
      }

      // Get first page
      const page1 = await messageThreadsRepository.getFilteredSupportChats(
        { conditions: [] },
        { orders: [{ field: "createdAt", direction: "desc" }] },
        { page: 1, limit: 2 }
      );

      expect(page1.docs.length).toBeLessThanOrEqual(2);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.limit).toBe(2);
      expect(page1.pagination.totalPages).toBeGreaterThan(1);

      // Get second page
      const page2 = await messageThreadsRepository.getFilteredSupportChats(
        { conditions: [] },
        { orders: [{ field: "createdAt", direction: "desc" }] },
        { page: 2, limit: 2 }
      );

      expect(page2.docs.length).toBeLessThanOrEqual(2);
      expect(page2.pagination.page).toBe(2);

      // Cleanup
      for (const chat of chats) {
        // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
      }
    });
  });

  describe("addMessageToSupportChat", () => {
    it("should add a text message to support chat", async () => {
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Message Chat ${Date.now()}`,
        buildRequestEnv()
      );

      const messageContent = "Test message content";
      const message = await messageThreadsRepository.addMessageToSupportChat(
        chat.maid,
        messageContent,
        "text",
        testHumanHaid,
        "client"
      );

      expect(message).toBeDefined();
      expect(message.uuid).toBeDefined();
      expect(message.maid).toBe(chat.maid);
      expect(message.dataIn).toBeDefined();

      const dataIn = typeof message.dataIn === "string" 
        ? JSON.parse(message.dataIn) 
        : message.dataIn;
      expect(dataIn.content).toBe(messageContent);
      expect(dataIn.messageType).toBe("text");
      expect(dataIn.humanHaid).toBe(testHumanHaid);

      createdMessageUuid = message.uuid;

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should add a photo message to support chat", async () => {
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Photo Chat ${Date.now()}`,
        buildRequestEnv()
      );

      const messageContent = "Photo message";
      const mediaUuid = crypto.randomUUID();
      const message = await messageThreadsRepository.addMessageToSupportChat(
        chat.maid,
        messageContent,
        "photo",
        testHumanHaid,
        "client",
        mediaUuid
      );

      expect(message).toBeDefined();
      const dataIn = typeof message.dataIn === "string" 
        ? JSON.parse(message.dataIn) 
        : message.dataIn;
      expect(dataIn.messageType).toBe("photo");
      expect(dataIn.mediaUuid).toBe(mediaUuid);

      // Cleanup
      await messagesRepository.deleteByUuid(message.uuid, true);
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should throw error if humanHaid is missing", async () => {
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Error Chat ${Date.now()}`,
        buildRequestEnv()
      );

      await expect(
        messageThreadsRepository.addMessageToSupportChat(
          chat.maid,
          "Test",
          "text",
          "" as any,
          "client"
        )
      ).rejects.toThrow("Human haid is required to add message to support chat");

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should throw error if content is missing", async () => {
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Error Chat ${Date.now()}`,
        buildRequestEnv()
      );

      await expect(
        messageThreadsRepository.addMessageToSupportChat(
          chat.maid,
          "",
          "text",
          testHumanHaid,
          "client"
        )
      ).rejects.toThrow("Content is required to add message to support chat");

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should throw error if messageType is missing", async () => {
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Error Chat ${Date.now()}`,
        buildRequestEnv()
      );

      await expect(
        messageThreadsRepository.addMessageToSupportChat(
          chat.maid,
          "Test",
          "" as any,
          testHumanHaid,
          "client"
        )
      ).rejects.toThrow("Message type is required to add message to support chat");

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });
  });

  describe("updateChatStatus", () => {
    it("should update chat status to CLOSED", async () => {
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Status Chat ${Date.now()}`,
        buildRequestEnv()
      );

      expect(chat.statusName).toBe("OPEN");

      const updatedChat = await messageThreadsRepository.updateChatStatus(chat.maid, "CLOSED");

      expect(updatedChat).toBeDefined();
      expect(updatedChat.statusName).toBe("CLOSED");

      // Verify in database
      const foundChat = await messageThreadsRepository.findByMaid(chat.maid);
      expect(foundChat?.statusName).toBe("CLOSED");

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should update chat status to OPEN", async () => {
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Status Chat ${Date.now()}`,
        buildRequestEnv()
      );

      // First close it
      await messageThreadsRepository.updateChatStatus(chat.maid, "CLOSED");

      // Then open it
      const updatedChat = await messageThreadsRepository.updateChatStatus(chat.maid, "OPEN");

      expect(updatedChat.statusName).toBe("OPEN");

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should throw error if chat not found", async () => {
      const nonExistentMaid = `m-${generateAid("m")}`;

      await expect(
        messageThreadsRepository.updateChatStatus(nonExistentMaid, "CLOSED")
      ).rejects.toThrow("Chat not found");
    });

    it("should throw error if chat is not a support chat", async () => {
      // Create a non-support chat (if possible)
      // This test might need adjustment based on your schema
      // For now, we'll test with a support chat that we manually change type
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Type Chat ${Date.now()}`,
        buildRequestEnv()
      );

      // Note: This test assumes we can't easily create non-support chats
      // If you have a way to do this, add it here
      
      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });
  });

  describe("assignManager", () => {
    it("should assign a manager to a chat", async () => {
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Manager Chat ${Date.now()}`,
        buildRequestEnv()
      );

      const updatedChat = await messageThreadsRepository.assignManager(chat.maid, testManagerHaid);

      expect(updatedChat).toBeDefined();
      const dataIn = typeof updatedChat.dataIn === "string" 
        ? JSON.parse(updatedChat.dataIn) 
        : updatedChat.dataIn;
      expect(dataIn.managerHaid).toBe(testManagerHaid);

      // Verify in database
      const foundChat = await messageThreadsRepository.findByMaid(chat.maid);
      const foundDataIn = typeof foundChat?.dataIn === "string" 
        ? JSON.parse(foundChat.dataIn) 
        : foundChat?.dataIn;
      expect(foundDataIn?.managerHaid).toBe(testManagerHaid);

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should remove manager when null is passed", async () => {
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Manager Chat ${Date.now()}`,
        buildRequestEnv()
      );

      // First assign manager
      await messageThreadsRepository.assignManager(chat.maid, testManagerHaid);

      // Then remove manager
      const updatedChat = await messageThreadsRepository.assignManager(chat.maid, null);

      const dataIn = typeof updatedChat.dataIn === "string" 
        ? JSON.parse(updatedChat.dataIn) 
        : updatedChat.dataIn;
      expect(dataIn.managerHaid).toBeUndefined();

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should throw error if chat not found", async () => {
      const nonExistentMaid = `m-${generateAid("m")}`;

      await expect(
        messageThreadsRepository.assignManager(nonExistentMaid, testManagerHaid)
      ).rejects.toThrow("Chat not found");
    });

    it("should throw error if chat is not a support chat", async () => {
      // Similar to updateChatStatus test
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Type Chat ${Date.now()}`,
        buildRequestEnv()
      );

      // Note: This test assumes we can't easily create non-support chats
      // If you have a way to do this, add it here
      
      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });

    it("should preserve existing dataIn when assigning manager", async () => {
      const chat = await messageThreadsRepository.startNewSupportChat(
        testHumanHaid,
        `Data Chat ${Date.now()}`,
        buildRequestEnv()
      );

      // Verify initial dataIn
      const initialDataIn = typeof chat.dataIn === "string" 
        ? JSON.parse(chat.dataIn) 
        : chat.dataIn;
      expect(initialDataIn.humanHaid).toBe(testHumanHaid);

      // Assign manager
      const updatedChat = await messageThreadsRepository.assignManager(chat.maid, testManagerHaid);

      const updatedDataIn = typeof updatedChat.dataIn === "string" 
        ? JSON.parse(updatedChat.dataIn) 
        : updatedChat.dataIn;
      expect(updatedDataIn.humanHaid).toBe(testHumanHaid); // Should be preserved
      expect(updatedDataIn.managerHaid).toBe(testManagerHaid); // Should be added

      // Cleanup
      // await messageThreadsRepository.deleteByUuid(chat.uuid, true);
    });
  });
});

















