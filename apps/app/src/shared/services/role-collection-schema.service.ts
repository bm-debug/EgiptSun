import type BaseCollection from '@/shared/collections/BaseCollection';
import { getCollection } from '@/shared/collections/getCollection';
import { SettingsRepository } from '@/shared/repositories/settings.repository';
import type {
  RoleSchemaDataIn,
  RoleCollectionConfig,
  RoleSchemaSetting,
} from '@/shared/types/role-schema-settings';
import type { Setting } from '@/shared/schema';
import { RolesRepository } from '../repositories/roles.repository';
import { AltrpRole } from '../types/altrp';
import { logRoleSchemaSettingsChange } from './user-journal.service';

const ADMINISTRATOR_ROLE = 'Administrator';

function parseDataIn(raw: unknown): RoleSchemaDataIn | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw) && ('roleName' in raw || 'collectionsConfig' in raw)) {
    const data = raw as Record<string, unknown>;
    const roleName =
      typeof data.roleName === 'string' ? data.roleName : undefined;
    const rawConfig = data.collectionsConfig;
    let collectionsConfig: RoleCollectionConfig[] | undefined;
    if (Array.isArray(rawConfig)) {
      collectionsConfig = rawConfig.filter(
        (c): c is RoleCollectionConfig =>
          c != null && typeof c === 'object' && typeof (c as RoleCollectionConfig).collectionName === 'string'
      ) as RoleCollectionConfig[];
    } else if (rawConfig != null && typeof rawConfig === 'object') {
      collectionsConfig = Object.entries(rawConfig as Record<string, RoleCollectionConfig>).map(
        ([name, c]) => ({ ...c, collectionName: c?.collectionName ?? name })
      );
    }
    const cabinet = data.cabinet != null && typeof data.cabinet === 'object' ? data.cabinet : undefined;
    const base_url = typeof data.base_url === 'string' ? data.base_url : undefined;
    const auth_redirect_url = typeof data.auth_redirect_url === 'string' ? data.auth_redirect_url : undefined;
    return {
      roleName: roleName ?? undefined,
      collectionsConfig,
      cabinet,
      base_url,
      auth_redirect_url,
    };
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseDataIn(parsed);
    } catch {
      return null;
    }
  }
  return null;
}

export class RoleCollectionSchemaService {
  private static instance: RoleCollectionSchemaService | null = null;

  public static getInstance(): RoleCollectionSchemaService {
    if (!RoleCollectionSchemaService.instance) {
      RoleCollectionSchemaService.instance = new RoleCollectionSchemaService();
    }
    return RoleCollectionSchemaService.instance;
  }

  /**
   * Returns collection names configured for the role.
   * Administrator is not configurable — returns [].
   */
  public async getCollectionsForRole(roleName: string): Promise<string[]> {
    if (roleName === ADMINISTRATOR_ROLE) return [];

    const repo = SettingsRepository.getInstance();
    const setting = await repo.findByRoleSchema(roleName);
    const dataIn = parseDataIn(setting?.dataIn);
    return (dataIn?.collectionsConfig ?? []).map((c) => c.collectionName);
  }

  /**
   * Returns collection instance for the role if the collection is in the role's config.
   * Administrator is not configurable — returns null.
   */
  public async getCollectionConfigForRole(
    roleName: string,
    collectionName: string
  ): Promise<BaseCollection | null> {
    if (roleName === ADMINISTRATOR_ROLE) return null;

    const repo = SettingsRepository.getInstance();
    const setting = await repo.findByRoleSchema(roleName);
    const dataIn = parseDataIn(setting?.dataIn);
    const config = dataIn?.collectionsConfig?.find(
      (c) => c.collectionName === collectionName
    );
    if (!dataIn || !config) return null;

    const collection = getCollection(collectionName, 'base') as BaseCollection;
    if (config) {
      if (config.__title != null) (collection as any).__title = config.__title;
      if (config.__defaultSort != null)
        (collection as any).__defaultSort = config.__defaultSort;
      if (config.olap != null) {
        (collection as any).getOLAP = async () => config.olap ?? null;
      }
    }

    return collection;
  }

  /**
   * Saves role schema settings by UUID.
   * Validates that the role exists, then updates dataIn for the setting.
   * Пишет в журнал событие изменения (RoleSchemaChangesJournalLog) при успешном обновлении.
   */
  public async saveRoleSchemaSettings(
    uuid: string,
    dataIn: RoleSchemaDataIn,
    userId?: number | string | null
  ): Promise<Setting> {
    if (!dataIn.roleName) {
      throw new Error('roleName is required in dataIn');
    }
    const roleRepo = RolesRepository.getInstance();
    const role = await roleRepo.findByName(dataIn.roleName) as AltrpRole;
    if (!role) {
      throw new Error(`Role "${dataIn.roleName}" not found`);
    }
    const repo = SettingsRepository.getInstance();
    const oldSetting = (await repo.findByUuid(uuid)) as RoleSchemaSetting | undefined;
    role.dataIn.auth_redirect_url = dataIn.auth_redirect_url || dataIn.base_url;
    await roleRepo.update(role.uuid, role);
    const updatedSetting = await repo.updateByUuid(uuid, { dataIn });
    await logRoleSchemaSettingsChange(
      {
        details: {
          old_value: (oldSetting ?? updatedSetting) as RoleSchemaSetting,
          newValue: updatedSetting as RoleSchemaSetting,
        },
      },
      userId
    );
    return updatedSetting;
  }
}
