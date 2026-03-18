import { AuthenticatedRequestContext, withAdminGuard } from '@/shared/api-guard'
import { SettingsRepository } from '@/shared/repositories/settings.repository'
import { getPostgresClient, executeRawQuery, createDb } from '@/shared/repositories/utils'
import { LANGUAGES } from '@/settings'

const supportedLanguageCodes = ['en', 'ru', 'rs']

interface DataInField {
  key: string
  title: Record<string, string>
  defaultValue: string
}

interface TableDataInFields {
  fields: DataInField[]
}

interface TableColumnVisibility {
  columnVisibility: Record<string, boolean>
}

/**
 * Detect data_in fields from collection records
 */
async function detectDataInFields(collection: string): Promise<DataInField[]> {
  const db = createDb()
  const client = getPostgresClient(db)
  
  // Get last 100 records to analyze (for performance)
  const recordsResult = await executeRawQuery(
    client,
    `SELECT data_in FROM "${collection}" WHERE data_in IS NOT NULL LIMIT 100`
  )
  
  const allFieldsMap = new Map<string, {
    titles: Record<string, Set<string>>
    defaultValue: string | null
  }>()
  
  for (const row of recordsResult || []) {
    const dataIn = row.data_in
    if (!dataIn) continue
    
    try {
      let parsed: any = dataIn
      if (typeof dataIn === 'string') {
        try {
          parsed = JSON.parse(dataIn)
        } catch {
          continue
        }
      }
      
      if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed)) {
          // Remove language suffix if present
          const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
          const baseKey = langMatch && supportedLanguageCodes.includes(langMatch[2].toLowerCase())
            ? langMatch[1]
            : key
          
          if (!allFieldsMap.has(baseKey)) {
            allFieldsMap.set(baseKey, {
              titles: {},
              defaultValue: null
            })
          }
          
          const fieldInfo = allFieldsMap.get(baseKey)!
          
          // If value is an object with language keys
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const langObj = value as Record<string, any>
            
            // Check if it's a language object (has keys like 'en', 'ru', 'rs')
            const langKeys = Object.keys(langObj).filter(k => supportedLanguageCodes.includes(k.toLowerCase()))
            
            if (langKeys.length > 0) {
              // It's a language object
              for (const lang of langKeys) {
                const langValue = langObj[lang]
                if (langValue && typeof langValue === 'object' && 'title' in langValue) {
                  if (!fieldInfo.titles[lang]) {
                    fieldInfo.titles[lang] = new Set()
                  }
                  if (langValue.title) {
                    fieldInfo.titles[lang].add(String(langValue.title))
                  }
                  if (!fieldInfo.defaultValue && langValue.value != null) {
                    fieldInfo.defaultValue = String(langValue.value)
                  }
                }
              }
            } else {
              // It's a plain object, might have title/value structure
              if ('title' in langObj && langObj.title) {
                // Try to determine language from key
                if (langMatch) {
                  const lang = langMatch[2].toLowerCase()
                  if (!fieldInfo.titles[lang]) {
                    fieldInfo.titles[lang] = new Set()
                  }
                  fieldInfo.titles[lang].add(String(langObj.title))
                }
              }
              if (!fieldInfo.defaultValue && 'value' in langObj && langObj.value != null) {
                fieldInfo.defaultValue = String(langObj.value)
              }
            }
          } else if (value !== null && value !== undefined) {
            // Simple value
            if (!fieldInfo.defaultValue) {
              fieldInfo.defaultValue = String(value)
            }
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
      continue
    }
  }
  
  // Convert to DataInField array
  const fields: DataInField[] = []
  for (const [baseKey, info] of allFieldsMap.entries()) {
    const title: Record<string, string> = {}
    
    // Get most common title for each language
    for (const lang of supportedLanguageCodes) {
      if (info.titles[lang] && info.titles[lang].size > 0) {
        // Get first title (or most common if we want to be smarter)
        const titlesArray = Array.from(info.titles[lang])
        title[lang] = titlesArray[0] || baseKey
      } else {
        // Fallback: use baseKey capitalized
        title[lang] = baseKey.charAt(0).toUpperCase() + baseKey.slice(1)
      }
    }
    
    fields.push({
      key: baseKey,
      title,
      defaultValue: info.defaultValue || ''
    })
  }
  
  return fields.sort((a, b) => a.key.localeCompare(b.key))
}

const handleGet = async (context: AuthenticatedRequestContext) => {
  const { request } = context
  try {
    const url = new URL(request.url)
    const collection = url.searchParams.get('collection')
    const type = url.searchParams.get('type') // 'dataInFields' or 'columnVisibility'
    const role = url.searchParams.get('role')
    
    if (!collection) {
      return new Response(
        JSON.stringify({ error: 'collection parameter is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    const repository = SettingsRepository.getInstance()
    
    if (type === 'dataInFields') {
      // Check if cached in Settings
      const attribute = `table-data-in-fields-${collection}`
      const cached = await repository.findByAttribute(attribute)
      
      if (cached && cached.dataIn) {
        try {
          const cachedData = typeof cached.dataIn === 'string' 
            ? JSON.parse(cached.dataIn) 
            : cached.dataIn
          
          if (cachedData && cachedData.fields && Array.isArray(cachedData.fields)) {
            return new Response(
              JSON.stringify({
                success: true,
                fields: cachedData.fields,
                cached: true,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }
        } catch (e) {
          // Cache invalid, detect fresh
        }
      }
      
      // Detect fields from collection
      const fields = await detectDataInFields(collection)
      
      // Cache result (async, don't wait)
      if (fields.length > 0) {
        const attribute = `table-data-in-fields-${collection}`
        const existing = await repository.findByAttribute(attribute)
        const dataIn: TableDataInFields = { fields }
        
        if (existing && existing.uuid) {
          repository.updateByUuid(existing.uuid, { dataIn }).catch(console.error)
        } else {
          // Create new setting (would need to implement create method or use direct DB)
          // For now, just return without caching
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          fields,
          cached: false,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } else if (type === 'columnVisibility') {
      if (!role) {
        return new Response(
          JSON.stringify({ error: 'role parameter is required for columnVisibility' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      
      const attribute = `table-column-visibility-${collection}-${role}`
      const setting = await repository.findByAttribute(attribute)
      
      if (setting && setting.dataIn) {
        try {
          const data = typeof setting.dataIn === 'string'
            ? JSON.parse(setting.dataIn)
            : setting.dataIn
          
          if (data && data.columnVisibility) {
            return new Response(
              JSON.stringify({
                success: true,
                columnVisibility: data.columnVisibility,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }
        } catch (e) {
          // Invalid data
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          columnVisibility: null,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid type parameter. Use "dataInFields" or "columnVisibility"' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  } catch (error) {
    console.error('Get table settings error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch table settings',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

const handlePut = async (context: AuthenticatedRequestContext) => {
  const { request } = context
  try {
    const body = await request.json() as {
      collection: string
      role: string
      columnVisibility: Record<string, boolean>
    }
    
    if (!body.collection || !body.role) {
      return new Response(
        JSON.stringify({ error: 'collection and role are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    const repository = SettingsRepository.getInstance()
    const attribute = `table-column-visibility-${body.collection}-${body.role}`
    
    const existing = await repository.findByAttribute(attribute)
    const dataIn: TableColumnVisibility = {
      columnVisibility: body.columnVisibility || {}
    }
    
    if (existing && existing.uuid) {
      const updated = await repository.updateByUuid(existing.uuid, { dataIn })
      return new Response(
        JSON.stringify({
          success: true,
          setting: updated,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } else {
      // Create new setting using repository
      const newSetting = await repository.create({
        uuid: crypto.randomUUID(),
        attribute,
        dataIn,
      })
      
      return new Response(
        JSON.stringify({
          success: true,
          setting: newSetting,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  } catch (error) {
    console.error('Update table settings error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to update table settings',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const GET = withAdminGuard(handleGet)
export const PUT = withAdminGuard(handlePut)
