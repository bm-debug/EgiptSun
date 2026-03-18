import { apiMethods } from './apiMethods';

export type ApiKey = keyof typeof apiMethods;

export type ResponseOf<K extends ApiKey> = typeof apiMethods[K]['response'];

export type PathParamsOf<K extends ApiKey> = typeof apiMethods[K]['pathParams'];

export type BodyOf<K extends ApiKey> = typeof apiMethods[K]['body'];

export type MethodOf<K extends ApiKey> = typeof apiMethods[K]['method'];