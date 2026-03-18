import sharp from 'sharp'

import type { IOcrProvider, OcrResult } from './providers'

export type SelfieNormalizationDecision =
  | 'original_strong'
  | 'flipped_better'
  | 'no_clear_winner'
  | 'ocr_error'

export interface SelfieImageNormalizationResult {
  file: File
  wasMirrored: boolean
  decision: SelfieNormalizationDecision
  scores?: {
    original: number
    flipped?: number
  }
}

/**
 * Normalizes selfie images before saving:
 * - applies EXIF-based rotation (sharp.rotate())
 * - optionally fixes horizontal mirroring (sharp.flop()) using OCR-based heuristics
 *
 * NOTE: "Mirrored selfie" is not reliably detectable from metadata.
 * Here we use a best-effort heuristic based on OCR quality/passport-like patterns.
 */
export class SelfieImageNormalizationService {
  constructor(private ocrProvider: IOcrProvider) {}

  async normalizeMirrorIfNeeded(file: File): Promise<SelfieImageNormalizationResult> {
    const inputBytes = new Uint8Array(await file.arrayBuffer())
    const format = this.getSharpFormat(file.type)

    // 1) Always normalize orientation first (EXIF rotate)
    const normalizedBuffer = await sharp(Buffer.from(inputBytes))
      .rotate()
      .toFormat(format, this.getFormatOptions(format))
      .toBuffer()

    let ocrOriginal: OcrResult | null = null
    try {
      ocrOriginal = await this.ocrProvider.detectText(new Uint8Array(normalizedBuffer))
    } catch {
      // If OCR fails, still return rotated/normalized image to avoid storing sideways images.
      return {
        file: this.toFile(normalizedBuffer, file, file.name, file.type),
        wasMirrored: false,
        decision: 'ocr_error',
      }
    }

    const scoreOriginal = this.scoreOcr(ocrOriginal)

    // If original already looks good enough, avoid extra API call.
    if (this.isStrongEnough(ocrOriginal, scoreOriginal)) {
      return {
        file: this.toFile(normalizedBuffer, file, file.name, file.type),
        wasMirrored: false,
        decision: 'original_strong',
        scores: { original: scoreOriginal },
      }
    }

    // 2) Try horizontal mirror fix (front camera often produces mirrored preview)
    let flippedBuffer: Buffer
    try {
      flippedBuffer = await sharp(normalizedBuffer)
        .flop()
        .toFormat(format, this.getFormatOptions(format))
        .toBuffer()
    } catch {
      return {
        file: this.toFile(normalizedBuffer, file, file.name, file.type),
        wasMirrored: false,
        decision: 'no_clear_winner',
        scores: { original: scoreOriginal },
      }
    }

    let ocrFlipped: OcrResult | null = null
    try {
      ocrFlipped = await this.ocrProvider.detectText(new Uint8Array(flippedBuffer))
    } catch {
      return {
        file: this.toFile(normalizedBuffer, file, file.name, file.type),
        wasMirrored: false,
        decision: 'no_clear_winner',
        scores: { original: scoreOriginal },
      }
    }

    const scoreFlipped = this.scoreOcr(ocrFlipped)

    // Require a meaningful improvement to avoid flipping by accident.
    const margin = 0.15
    const shouldFlip = scoreFlipped > scoreOriginal + margin

    if (shouldFlip) {
      return {
        file: this.toFile(flippedBuffer, file, file.name, file.type),
        wasMirrored: true,
        decision: 'flipped_better',
        scores: { original: scoreOriginal, flipped: scoreFlipped },
      }
    }

    return {
      file: this.toFile(normalizedBuffer, file, file.name, file.type),
      wasMirrored: false,
      decision: 'no_clear_winner',
      scores: { original: scoreOriginal, flipped: scoreFlipped },
    }
  }

  private toFile(buffer: Buffer, original: File, filename: string, mimeType: string): File {
    return new File([new Uint8Array(buffer)], filename, {
      type: mimeType,
      lastModified: original.lastModified,
    })
  }

  private getSharpFormat(mimeType: string): 'jpeg' | 'png' | 'webp' {
    const t = mimeType.toLowerCase()
    if (t === 'image/png') return 'png'
    if (t === 'image/webp') return 'webp'
    // Treat image/jpg as jpeg too
    return 'jpeg'
  }

  private getFormatOptions(format: 'jpeg' | 'png' | 'webp') {
    if (format === 'jpeg') return { quality: 90 }
    if (format === 'webp') return { quality: 90 }
    return undefined
  }

  private isStrongEnough(ocr: OcrResult, score: number): boolean {
    const text = (ocr.fullText || '').trim()
    if (this.hasPassportNumber(text)) return true
    if (text.length >= 450 && ocr.confidence >= 0.75) return true
    return score >= 1.65
  }

  private scoreOcr(ocr: OcrResult): number {
    const text = (ocr.fullText || '').trim()
    const len = Math.min(text.length, 2000)
    const lenScore = len / 2000 // 0..1

    const passportBonus = this.hasPassportNumber(text) ? 0.6 : 0
    const dateBonus = /\b\d{2}\.\d{2}\.\d{4}\b/.test(text) ? 0.3 : 0
    const keywordBonus = /(РОССИЯ|ПАСПОРТ|ФАМИЛИЯ|ИМЯ|ОТЧЕСТВО|PASSPORT|RUSSIAN)/i.test(text) ? 0.2 : 0
    const cyrBonus = this.cyrillicRatio(text) > 0.25 ? 0.1 : 0

    // Base weights tuned for "passport is visible" photos.
    return ocr.confidence * 1.5 + lenScore * 0.7 + passportBonus + dateBonus + keywordBonus + cyrBonus
  }

  private hasPassportNumber(text: string): boolean {
    // Common RU passport series+number pattern: 4 digits + 6 digits (optionally separated by space)
    return /\b\d{4}\s?\d{6}\b/.test(text)
  }

  private cyrillicRatio(text: string): number {
    const letters = text.match(/[A-Za-zА-Яа-яЁё]/g) || []
    if (letters.length === 0) return 0
    const cyr = letters.filter((ch) => /[А-Яа-яЁё]/.test(ch)).length
    return cyr / letters.length
  }
}


