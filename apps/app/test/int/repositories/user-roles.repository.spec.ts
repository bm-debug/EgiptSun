import { describe, it, beforeAll, expect } from "bun:test";
import { getPlatformProxy } from "wrangler";
import { eq, and } from "drizzle-orm";
import { UserRolesRepository } from "@/shared/repositories/user-roles.repository";
import { UsersRepository } from "@/shared/repositories/users.repository";
import { RolesRepository } from "@/shared/repositories/roles.repository";

describe("UserRolesRepository", () => {
    let db: D1Database;
    let userRolesRepository: UserRolesRepository;
    let usersRepository: UsersRepository;
    let rolesRepository: RolesRepository;

    beforeAll(async () => {
        const platformProxy = await getPlatformProxy({
            configPath: "wrangler.test.toml",
        });

        db = platformProxy.env.DB as D1Database;
        userRolesRepository = UserRolesRepository.getInstance();
        usersRepository = UsersRepository.getInstance();
        rolesRepository = RolesRepository.getInstance();
    });

    describe("assignRolesToUser and removeRolesFromUser", () => {
        it("создает роль test, привязывает к пользователю, проверяет связь, удаляет связь и удаляет роль", async () => {
            // 1. Создаем роль "test" при помощи RolesRepository

            let testRole = (await rolesRepository.getFiltered({
                conditions: [{
                    field: "name",
                    operator: "eq",
                    values: ["test"]
                }]
            }, {orders: [{field: "createdAt", direction: "desc"}]}, {page: 1, limit: 1})).docs[0];
            if(!testRole) {
                testRole = await rolesRepository.create({
                    name: "test",
                    title: "Test Role",
                    description: "Test role for integration tests",
                    isSystem: false,
                });
            }
            expect(testRole).toBeDefined();
            expect(testRole.uuid).toBeDefined();
            expect(testRole.name).toBe("test");

            // 2. Получаем существующего пользователя из БД
            const allUsers = await usersRepository.findAll();
            expect(allUsers.length).toBeGreaterThan(0);
            const existingUser = allUsers[0];
            expect(existingUser).toBeDefined();
            expect(existingUser.uuid).toBeDefined();

            // 3. Создаем связь к существующему пользователю
            await userRolesRepository.assignRolesToUser(existingUser.uuid, [testRole.uuid]);

            // 4. Проверяем, что связь есть
            const userRolesAfterAssign = await userRolesRepository
                .getSelectQuery()
                .where(
                    and(
                        eq(userRolesRepository.schema.userUuid, existingUser.uuid),
                        eq(userRolesRepository.schema.roleUuid, testRole.uuid)
                    )
                )
                .execute();

            expect(userRolesAfterAssign.length).toBe(1);
            expect(userRolesAfterAssign[0].userUuid).toBe(existingUser.uuid);
            expect(userRolesAfterAssign[0].roleUuid).toBe(testRole.uuid);

            // 5. Удаляем связь
            await userRolesRepository.removeRolesFromUser(existingUser.uuid, [testRole.uuid]);

            // Проверяем, что связь удалена
            const userRolesAfterRemove = await userRolesRepository
                .getSelectQuery()
                .where(
                    and(
                        eq(userRolesRepository.schema.userUuid, existingUser.uuid),
                        eq(userRolesRepository.schema.roleUuid, testRole.uuid)
                    )
                )
                .execute();

            expect(userRolesAfterRemove.length).toBe(0);

            // 6. Удаляем новую роль
            await rolesRepository.deleteByUuid(testRole.uuid, true);

            // Проверяем, что роль удалена
            const deletedRole = await rolesRepository.findByUuid(testRole.uuid);
            expect(deletedRole).toBeUndefined();
        });
    });
});
