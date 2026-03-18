import BaseRepository from './BaseRepositroy'
import { schema } from '../schema'
import { Goal } from '../schema/types'
import { generateAid } from '../generate-aid'
import {
  CollectionGoalDataIn,
  CollectionGoalPriority,
  CollectionGoalType,
  CollectionStage,
  altrpFinance,
  altrpGoal,
  NewaltrpGoal,
} from '../types/altrp-finance'
import { AdminTaskDataIn } from '../types/tasks'
import { parseJson, withNotDeleted } from './utils'
import { desc, eq, inArray } from 'drizzle-orm'

export const ADMIN_TASK_TYPE = 'ADMIN_TASK'

export class GoalsRepository extends BaseRepository<Goal> {
  constructor() {
    super(schema.goals)
  }

  public static getInstance(): GoalsRepository {
    return new GoalsRepository()
  }

  protected async beforeCreate(data: Partial<NewaltrpGoal>): Promise<void> {
    if (!data.gaid) {
      data.gaid = generateAid('g')
    }
    if (!data.fullGaid) {
      data.fullGaid = data.gaid
    }
    if (typeof data.isPublic === 'undefined' || data.isPublic === null) {
      data.isPublic = 1
    }
    // Ensure admin tasks are always public
    if (data.type === ADMIN_TASK_TYPE) {
      data.isPublic = 1
    }
    if (!data.statusName) {
      data.statusName = 'TODO'
    }
  }

  protected async beforeUpdate(_: string, data: Partial<NewaltrpGoal>): Promise<void> {
    return
  }

  public async getAdminTasks(options: { assigneeUuid?: string; statuses?: string[] } = {}): Promise<Goal[]> {
    const where = withNotDeleted(
      this.schema.deletedAt,
      eq(this.schema.type, ADMIN_TASK_TYPE),
      options.assigneeUuid ? eq(this.schema.xaid, options.assigneeUuid) : undefined,
      options.statuses && options.statuses.length > 0 ? inArray(this.schema.statusName, options.statuses) : undefined
    )

    const rows = await this.db
      .select()
      .from(this.schema)
      .where(where)
      .orderBy(desc(this.schema.updatedAt), desc(this.schema.createdAt))
      .execute()

    return rows as Goal[]
  }

  public async findAdminTaskByUuid(uuid: string): Promise<Goal | null> {
    const where = withNotDeleted(
      this.schema.deletedAt,
      eq(this.schema.uuid, uuid),
      eq(this.schema.type, ADMIN_TASK_TYPE)
    )

    const [goal] = await this.db
      .select()
      .from(this.schema)
      .where(where)
      .limit(1)
      .execute()

    return goal ? (goal as Goal) : null
  }

  public async createAdminTask(data: {
    title: string
    statusName?: string
    priority?: 'low' | 'medium' | 'high'
    assigneeUuid?: string
    assigneeName?: string
    assigneeAvatar?: string
    clientLink?: string
    createdByHumanHaid?: string
    deadline?: string
  }): Promise<Goal> {
    const taskDataIn: AdminTaskDataIn = {
      priority: data.priority,
      assigneeUuid: data.assigneeUuid,
      assigneeName: data.assigneeName,
      assigneeAvatar: data.assigneeAvatar,
      clientLink: data.clientLink,
      createdByHumanHaid: data.createdByHumanHaid,
      deadline: data.deadline,
    }

    const createdGoal = await this.create({
      title: data.title,
      statusName: data.statusName,
      type: ADMIN_TASK_TYPE,
      cycle: 'ONCE',
      xaid: data.assigneeUuid,
      dataIn: taskDataIn,
      order: '0',
      isPublic: 1,
    })

    return createdGoal as Goal
  }

  public async createCollectionGoalFromFinance(
    finance: altrpFinance,
    data: Partial<CollectionGoalDataIn> & Pick<CollectionGoalDataIn, 'dealAid' | 'financeFaid' | 'overdueDays' | 'deadline'>
  ): Promise<altrpGoal> {
    const financeDataIn = parseJson<CollectionGoalDataIn | null>(finance.dataIn, null)

    const overdueDays = data.overdueDays
    let goalType: CollectionGoalType = 'CLIENT_CALL'
    let stage: CollectionStage = 'CLIENT_CALL'
    let priority: CollectionGoalPriority = 'MEDIUM'
    let instructions = `Связаться с клиентом по просроченному платежу. Просрочка: ${overdueDays} дней.`

    if (overdueDays > 3 && overdueDays <= 5) {
      goalType = 'GUARANTOR_CALL'
      stage = 'GUARANTOR_CALL'
      priority = 'HIGH'
      instructions = `Связаться с поручителем по просроченному платежу. Просрочка: ${overdueDays} дней.`
    } else if (overdueDays > 5 && overdueDays <= 10) {
      goalType = 'FIELD_VISIT'
      stage = 'FIELD_VISIT'
      priority = 'HIGH'
      instructions = `Организовать выезд службы безопасности. Просрочка: ${overdueDays} дней.`
    } else if (overdueDays > 10) {
      goalType = 'LEGAL_NOTICE'
      stage = 'SECURITY_ESCALATION'
      priority = 'CRITICAL'
      instructions =
        `Критическая просрочка. Требуется эскалация и подготовка юридических документов. Просрочка: ${overdueDays} дней.`
    }

    const goalDataIn: CollectionGoalDataIn = {
      type: data.type ?? goalType,
      stage: data.stage ?? stage,
      priority: data.priority ?? priority,
      dealAid: data.dealAid,
      financeFaid: finance.faid,
      clientAid: data.clientAid ?? financeDataIn?.clientAid ?? null,
      overdueDays,
      assigneeGroup: data.assigneeGroup || 'COLLECTION',
      deadline: data.deadline,
      autoCreated: true,
      relatedHumanAid: data.relatedHumanAid,
      instructions: data.instructions || instructions,
    }

    const title = `[Взыскание] ${
      goalDataIn.type === 'CLIENT_CALL'
        ? 'Звонок клиенту'
        : goalDataIn.type === 'GUARANTOR_CALL'
          ? 'Звонок поручителю'
          : goalDataIn.type === 'FIELD_VISIT'
            ? 'Выезд СБ'
            : 'Юридическое уведомление'
    } по сделке ${goalDataIn.dealAid}. Просрочка: ${overdueDays} дней`

    const newGoal: NewaltrpGoal = {
      uuid: crypto.randomUUID(),
      gaid: generateAid('g'),
      fullGaid: generateAid('g'),
      title,
      cycle: 'ONCE',
      type: 'COLLECTION',
      statusName: 'TODO',
      isPublic: 1,
      order: '0',
      dataIn: goalDataIn,
    }

    const createdGoal = (await this.create(newGoal)) as altrpGoal

    return createdGoal
  }
}

