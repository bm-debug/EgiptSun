import type { SortingState } from '@tanstack/react-table';
import type { OLAPSettings } from '@/shared/collections/BaseCollection';
import type { LanguageCode } from '@/settings';
import { Journal, NewSetting, Role, Setting } from '../schema';


export interface RoleSchemaSetting extends Setting{
  dataIn: RoleSchemaDataIn
}
export interface NewRoleSchemaSetting extends NewSetting{
  dataIn: RoleSchemaDataIn
}

/**
 * Data stored in settings.dataIn for role schema records.
 * Attribute format: role_schema_{roleName}
 */
export interface RoleSchemaDataIn {
  roleName?: string;

  /** Per-collection config list */
  collectionsConfig?: RoleCollectionConfig[];
  /** Cabinet config (title, base_url, redirectUrlAfterLogin) */
  cabinet?: RoleCabinetConfig;
  base_url?: string;
  auth_redirect_url?: string;
}
/** Multilang value: object with keys = language codes from settings (LANGUAGES), value = string per locale */
export type MultilangValue = Partial<Record<LanguageCode, string>>;

/** Cabinet config for the role (title, base URL, redirect after login) */
export interface RoleCabinetConfig {
  title?: MultilangValue;
  main_breadcrumbs_element_label?: MultilangValue;
}

/** CRUD flags for a collection (read is always true) */
export interface RoleCollectionCrud {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

/** Column config: selected ids, order, visibility */
export interface RoleCollectionColumnsConfig {
  selected?: string[];
  order?: string[];
  visibility?: Record<string, boolean>;
}

/**
 * Config for a single collection within a role schema.
 * Overrides BaseCollection __title, __defaultSort, getOLAP per role.
 * Stored in settings.dataIn (collectionsConfig).
 */
export interface RoleCollectionConfig {
  collectionName: string
  /** Override collection title for this role */
  __title?: MultilangValue;
  /** Override default sorting */
  __defaultSort?: SortingState;
  /** OLAP tabs config (stored in DB, returned by getOLAP) */
  olap?: OLAPSettings;
  /** CRUD toggles (read is always true) */
  crud?: RoleCollectionCrud;
  /** Column selection, order, visibility */
  columns?: RoleCollectionColumnsConfig;
}

export interface RoleSchemaChangesJournalLog extends Journal{
  dataIn:RoleSchemaChangesJournalLogDatain
  action: RoleSchemaSettingUpdateAction
}

export type RoleSchemaSettingUpdateAction = 'ROLE_SCHEMA_SETTINGS_UPDATE_ACTION'

export interface RoleSchemaChangesJournalLogDatain{
    details: {
      old_value: RoleSchemaSetting;
      newValue: RoleSchemaSetting;
    };
}
/**
 * Builds the settings attribute key for role schema.
 * @example getRoleSchemaAttribute('Manager') => 'role_schema_Manager'
 */
export function getRoleSchemaAttribute(roleName: string): string {
  return `role_schema_${roleName}`;
}


