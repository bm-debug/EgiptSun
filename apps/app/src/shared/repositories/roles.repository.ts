import { eq } from "drizzle-orm";
import BaseRepository from "./BaseRepositroy";
import { Role } from "../schema/types";
import { schema } from "../schema";

export class RolesRepository extends BaseRepository<Role> {
  constructor() {
    super(schema.roles);
  }

  public static getInstance(): RolesRepository {
    return new RolesRepository();
  }

  public async findByName(name: string): Promise<Role | null> {
    if (!name) return null;
    const [row] = await this.db
      .select()
      .from(this.schema)
      .where(eq(this.schema.name, name))
      .limit(1)
      .execute();
    return (row as Role) ?? null;
  }
}

