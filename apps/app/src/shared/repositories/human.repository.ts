import { eq, inArray, sql } from "drizzle-orm";
import { schema } from "../schema";
import  BaseRepository  from "./BaseRepositroy";
import { Human } from "../schema/types";
import { Client, ClientStatus, altrpHuman } from "../types/altrp";
import { generateAid } from "../generate-aid";
import Humans from "../collections/humans";
import { HumanExtended } from "../types/store";


export class HumanRepository extends BaseRepository<Human>{
    constructor() {
        super(schema.humans);
    }
    
    public static getInstance(): HumanRepository {
        return new HumanRepository();
    }
    async findByHaid(haid: string): Promise<any | null> {
        const human = await this.db.select().from(schema.humans).where(eq(schema.humans.haid, haid)).execute()
        return human[0]
    }
    async findByPhoneInDataIn(phone: string): Promise<any | null> {
        const [human] = await this.db
            .select()
            .from(schema.humans)
            .where(sql`LOWER((data_in::jsonb)->>'phone') = LOWER(${phone})`)
            .limit(1)
            .execute()
        return human || null
    }
    protected async beforeCreate(data: Partial<altrpHuman>): Promise<void> {
        if (!data.statusName) {
            data.statusName = 'PENDING'
        }
        if(! data.haid) {
            data.haid = generateAid('h')
        }
    }
    async generateClientByEmail(email: string, data: Partial<Client>): Promise<Client> {
        let [human] = await this.db.select().from(schema.humans).where(eq(schema.humans.email, email)).execute() as Client[]
        if(! human) {

            const _data = {
                email,
                statusName: 'PENDING' as ClientStatus,
                haid: generateAid('h'),
                type: 'CLIENT',
                dataIn: {
                },
                ...data,
            }

            if(! _data.fullName) {
                _data.fullName = email
            }
            human = await this.create(_data) as Client
        } else {
            const updatedFields: Partial<Client> = {}

            if (data) {
                for (const [key, value] of Object.entries(data)) {
                    if (key === 'dataIn') {
                        continue
                    }
                    const currentValue = (human as unknown as Record<string, unknown>)[key]
                    // Only update if current value is empty/null/undefined or equals email (for fullName default)
                    const shouldUpdate = (
                        value !== undefined &&
                        value !== null &&
                        (currentValue === undefined ||
                         currentValue === null ||
                         currentValue === '' ||
                         (key === 'fullName' && currentValue === email))
                    )
                    if (shouldUpdate) {
                        (updatedFields as Record<string, unknown>)[key] = value
                    }
                }

                if (data.dataIn) {
                    const currentDataIn =
                        typeof human.dataIn === 'string'
                            ? (JSON.parse(human.dataIn) as Record<string, unknown>)
                            : (human.dataIn as Record<string, unknown>) || {}

                    const mergedDataIn = {
                        ...currentDataIn,
                        ...data.dataIn,
                    }

                    const dataInChanged = JSON.stringify(currentDataIn) !== JSON.stringify(mergedDataIn)

                    if (dataInChanged) {
                        updatedFields.dataIn = mergedDataIn as Client['dataIn']
                    }
                }
            }

            if (Object.keys(updatedFields).length > 0) {
                human = await this.update(human.uuid, updatedFields) as Client
            }
        }
        return human
    }
    async getAllManagers(): Promise<HumanExtended[]> {
        const managerRoles = await this.db
            .select()
            .from(schema.roles)
            .where(eq(schema.roles.name, 'manager'))
            .execute();

        if (!managerRoles.length) {
            return [];
        }

        const roleUuids = managerRoles
            .map((role) => role.uuid)
            .filter((uuid): uuid is string => Boolean(uuid));

        if (!roleUuids.length) {
            return [];
        }

        const userRoles = await this.db
            .select()
            .from(schema.userRoles)
            .where(inArray(schema.userRoles.roleUuid, roleUuids))
            .execute();

        const userUuids = Array.from(
            new Set(
                userRoles
                    .map((userRole) => userRole.userUuid)
                    .filter((uuid): uuid is string => Boolean(uuid))
            )
        );

        if (!userUuids.length) {
            return [];
        }

        const users = await this.db
            .select()
            .from(schema.users)
            .where(inArray(schema.users.uuid, userUuids))
            .execute();

        const humanAids = Array.from(
            new Set(
                users
                    .map((user) => user.humanAid)
                    .filter((aid): aid is string => Boolean(aid))
            )
        );

        if (!humanAids.length) {
            return [];
        }

        const humans = await this.db
            .select()
            .from(schema.humans)
            .where(inArray(schema.humans.haid, humanAids))
            .execute();

        const collection = new Humans();
        const parsed = collection.parse<HumanExtended>(humans as unknown as HumanExtended[]);

        return Array.isArray(parsed) ? parsed : [parsed];
    }
}