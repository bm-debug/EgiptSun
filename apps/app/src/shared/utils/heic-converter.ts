import heic2any from 'heic2any'

/**
 * Checks if a file is HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  const fileName = file.name.toLowerCase()
  const mimeType = file.type.toLowerCase()
  
  // Check by extension
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    return true
  }
  
  // Check by MIME type
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    return true
  }
  
  return false
}

/**
 * Converts HEIC/HEIF file to JPEG
 * @param file - HEIC/HEIF file to convert
 * @returns Promise resolving to JPEG File object
 * @throws Error if conversion fails
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    // Convert HEIC to JPEG blob
    // heic2any can return a single Blob or an array of Blobs (for multi-image HEIC)
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92, // High quality
    })

    // Handle both single blob and array of blobs
    const blob = Array.isArray(result) ? result[0] : result

    if (!blob) {
      throw new Error('Конвертация не вернула результат')
    }

    // Create new filename with .jpg extension
    const newFileName = file.name
      .replace(/\.(heic|heif)$/i, '.jpg')
      .replace(/\.(HEIC|HEIF)$/, '.jpg')
    
    // If no extension was replaced, append .jpg
    const finalFileName = newFileName === file.name 
      ? `${file.name}.jpg` 
      : newFileName

    // Create File object from blob
    const jpegFile = new File([blob], finalFileName, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })

    return jpegFile
  } catch (error) {
    console.error('HEIC conversion error:', error)
    throw new Error(
      'Не удалось обработать фото в формате HEIC. Загрузите JPG/PNG или включите на iPhone: Настройки → Камера → Форматы → Наиболее совместимый.'
    )
  }
}
