import BaseRepository from "./BaseRepositroy";
import { altrpUser } from "../types/altrp";
import { schema } from "../schema";
import { eq, inArray } from "drizzle-orm";

export class UsersRepository extends BaseRepository<altrpUser> {
    constructor() {
        super(schema.users);
    }

    public static getInstance(): UsersRepository {
        return new UsersRepository();
    }

    public async findByEmail(email: string): Promise<altrpUser | undefined> {
        const [user] = await this.db.select().from(this.schema).where(eq(this.schema.email, email)).limit(1).execute() as altrpUser[];
        return user;
    }

    public async findByHumanAid(humanAid: string): Promise<altrpUser | undefined> {
        const [user] = await this.db.select().from(this.schema).where(eq(this.schema.humanAid, humanAid)).limit(1).execute() as altrpUser[];
        return user;
    }
    public async hasRoles(humanAid: string, roleNames: string[]): Promise<boolean> {
        const user = await this.findByHumanAid(humanAid);
        if (!user) {
            return false;
        }
        const roles = await this.db.select().from(schema.roles).where(inArray(schema.roles.name, roleNames)).execute();
        const userRoles = await this.db.select().from(schema.userRoles).where(eq(schema.userRoles.userUuid, user.uuid)).execute();
        return userRoles.some(role => roles.some(r => r.uuid === role.roleUuid));
    }
    public async hasRole(humanAid: string, roleName: string): Promise<boolean> {
        return this.hasRoles(humanAid, [roleName]);
    }
}