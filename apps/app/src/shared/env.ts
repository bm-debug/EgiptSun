import { Env } from './types'

export const buildRequestEnv = (): Env => {
  // In Cloudflare Next-on-Pages, you usually get env from getRequestContext().env
  // However, since we don't have that dependency explicitly checked/installed here,
  // we will try to access it via global process.env or similar fallback.
  // If using 'nodejs_compat', process.env might contain bindings if configured.
  
  // Try to get it from the global scope if it exists (Cloudflare Workers often put bindings on globalThis)
  // @ts-ignore
  const globalEnv: any = typeof globalThis !== 'undefined' ? globalThis : {}

  // Don't create DB connection here - it should be created on-demand using createDb()
  // Creating it here causes multiple connections to be created on each request
  
  return Object.assign({}, process.env, globalEnv) as unknown as Env
}

