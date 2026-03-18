import BaseRepository from "./BaseRepositroy"
import { schema } from "../schema"
import type { UserRole, NewUserRole } from "../schema/types"
import { eq, and, inArray } from "drizzle-orm"
import { RolesRepository } from "./roles.repository"

export class UserRolesRepository extends BaseRepository<UserRole> {
    constructor() {
        super(schema.userRoles)
    }

    public static getInstance(): UserRolesRepository {
        return new UserRolesRepository()
    }

    public async assignRoleToUser(userUuid: string, roleUuid: string, order: number = 0): Promise<UserRole> {
        // Проверяем, существует ли уже такая связь
        const existingUserRole = await this.db
            .select()
            .from(this.schema)
            .where(
                and(
                    eq(this.schema.userUuid, userUuid),
                    eq(this.schema.roleUuid, roleUuid)
                )
            )
            .limit(1)
            .execute()

        if (existingUserRole.length > 0) {
            // Если связь уже существует, обновляем order и возвращаем существующую запись
            if (existingUserRole[0].order !== order) {
                await this.db
                    .update(this.schema)
                    .set({ order })
                    .where(
                        and(
                            eq(this.schema.userUuid, userUuid),
                            eq(this.schema.roleUuid, roleUuid)
                        )
                    )
                    .execute()
                return { ...existingUserRole[0], order } as UserRole
            }
            return existingUserRole[0] as UserRole
        }

        // Создаем новую связь, если её нет
        const payload: NewUserRole = {
            userUuid,
            roleUuid,
            order,
        }

        const result = await this.create(payload)
        return result as UserRole
    }

    public async assignRolesToUser(userUuid: string, roleUuids: string[]): Promise<void> {
        if (!roleUuids || roleUuids.length === 0) {
            return
        }

        for (let index = 0; index < roleUuids.length; index++) {
            const roleUuid = roleUuids[index]
            await this.assignRoleToUser(userUuid, roleUuid, index)
        }
    }
    public async assignRolesToUserByNames(userUuid: string, roleNames: string[]): Promise<void> {
        if (!userUuid || !roleNames || roleNames.length === 0) {
            return
        }

        // Находим роли по именам
        const rolesRepository = RolesRepository.getInstance()
        const allRoles = await rolesRepository.findAll()
        
        const roleUuids: string[] = []
        for (const roleName of roleNames) {
            const role = allRoles.find(r => r.name === roleName)
            if (role) {
                roleUuids.push(role.uuid)
            }
        }

        if (roleUuids.length === 0) {
            return
        }

        // Привязываем роли по UUID
        await this.assignRolesToUser(userUuid, roleUuids)
    }

    public async removeRolesFromUser(userUuid: string, roleUuids: string[]): Promise<void> {
        if (!userUuid || !roleUuids || roleUuids.length === 0) {
            return
        }
        await this.db
            .delete(this.schema)
            .where(
                and(
                    eq(this.schema.userUuid, userUuid),
                    inArray(this.schema.roleUuid, roleUuids)
                )
            )
            .execute()
    }

    public async removeAllRolesFromUser(userUuid: string): Promise<void> {
        if (!userUuid) {
            return
        }

        await this.db
            .delete(this.schema)
            .where(eq(this.schema.userUuid, userUuid))
            .execute()
    }
}


