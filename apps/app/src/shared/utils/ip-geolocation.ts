/**
 * Determines geographic region (city, country) from IP address
 * Uses ip-api.com free API (no key required, rate limited)
 * Returns null if geolocation fails or IP is localhost/private
 */
export async function getRegionFromIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null
  
  // Return "Localhost" for localhost IPs
  if (ip === '127.0.0.1' || ip === 'localhost') {
    return 'Localhost'
  }
  
  // Skip private IPs (return null for them)
  if (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('172.22.') ||
    ip.startsWith('172.23.') ||
    ip.startsWith('172.24.') ||
    ip.startsWith('172.25.') ||
    ip.startsWith('172.26.') ||
    ip.startsWith('172.27.') ||
    ip.startsWith('172.28.') ||
    ip.startsWith('172.29.') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.')
  ) {
    return null
  }
  
  try {
    // Use ip-api.com free API (no key required)
    // Format: city, region, country
    // Use AbortController for timeout support
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
    
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=status,message,city,regionName,country`, {
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return null
    }
    
    const data = (await response.json()) as {
      status: string
      city?: string
      regionName?: string
      country?: string
    }
    
    if (data.status === 'success') {
      const parts: string[] = []
      if (data.city) parts.push(data.city)
      if (data.regionName) parts.push(data.regionName)
      if (data.country) parts.push(data.country)
      
      return parts.length > 0 ? parts.join(', ') : null
    }
    
    return null
  } catch (error) {
    // Silently fail - geolocation is optional
    // Don't log AbortError as it's expected for timeout
    if (error instanceof Error && error.name !== 'AbortError') {
      console.debug('Failed to get region from IP:', error)
    }
    return null
  }
}

