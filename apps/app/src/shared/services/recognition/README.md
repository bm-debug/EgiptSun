# Recognition Services

Сервисы распознавания лиц и документов с поддержкой двух провайдеров: **Google Vision API** и **AWS Rekognition**.

## Архитектура

```
recognition/
├── providers/
│   ├── types.ts                      # Интерфейсы провайдеров
│   ├── google-vision.provider.ts     # Google Vision реализация
│   ├── aws-rekognition.provider.ts   # AWS Rekognition реализация
│   └── index.ts
├── face-matching.service.ts          # Сервис сравнения лиц
├── document-recognition.service.ts   # Сервис распознавания документов
├── passport-selfie-verification.service.ts  # Сервис верификации селфи с паспортом
└── index.ts
```

## Провайдеры

### Google Vision Provider

```typescript
import { GoogleVisionProvider } from '@/shared/services/recognition'

const provider = new GoogleVisionProvider(process.env.GOOGLE_VISION_API_KEY!)
```

**Требуемые переменные окружения:**
- `GOOGLE_VISION_API_KEY` - API ключ Google Cloud Vision

### AWS Rekognition Provider

```typescript
import { AwsRekognitionProvider } from '@/shared/services/recognition'

const provider = new AwsRekognitionProvider({
  region: process.env.AWS_REGION!,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
})
```

**Требуемые переменные окружения:**
- `AWS_REGION` - регион AWS (например, `us-east-1`)
- `AWS_ACCESS_KEY_ID` - AWS Access Key
- `AWS_SECRET_ACCESS_KEY` - AWS Secret Key

## Сервисы

### 1. Face Matching Service

Сравнивает два изображения лиц.

```typescript
import { FaceMatchingService, GoogleVisionProvider } from '@/shared/services/recognition'

// Инициализация с Google Vision
const provider = new GoogleVisionProvider(process.env.GOOGLE_VISION_API_KEY!)
const service = new FaceMatchingService(provider)

// Или с AWS Rekognition
const awsProvider = new AwsRekognitionProvider({
  region: process.env.AWS_REGION!,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
})
const service = new FaceMatchingService(awsProvider)

// Сравнение лиц
const result = await service.compareFacesFromBlobs(
  selfieBlob,        // Blob с фото лица
  passportPhotoBlob, // Blob с фото из паспорта
  0.8                // Порог схожести (optional, default: 0.8)
)

if (result.match) {
  console.log('Лица совпадают!', {
    similarity: result.similarity,  // 0-1
    confidence: result.confidence,  // 0-1
  })
} else {
  console.log('Лица не совпадают:', result.details.reasons)
}
```

**Результат:**
```typescript
interface FaceMatchResult {
  match: boolean
  similarity: number      // 0-1 scale
  confidence: number      // 0-1 scale
  details: {
    facesInFirst: number
    facesInSecond: number
    reasons?: string[]
  }
}
```

### 2. Document Recognition Service

Распознаёт текст из документа и заполняет данные Human.

```typescript
import { DocumentRecognitionService, GoogleVisionProvider } from '@/shared/services/recognition'

// Инициализация
const provider = new GoogleVisionProvider(process.env.GOOGLE_VISION_API_KEY!)
const service = new DocumentRecognitionService(provider)

// Распознать и обновить Human
const result = await service.recognizeAndUpdateHuman(
  mediaUuid,  // UUID загруженного изображения паспорта
  humanUuid   // UUID записи Human
)

if (result.success) {
  console.log('Распознанные данные:', result.recognizedData)
  // {
  //   fullName: "Иванов Иван Иванович",
  //   birthday: "01.01.1990",
  //   sex: "M",
  //   passportSeries: "1234",
  //   passportNumber: "567890",
  //   ...
  // }
}

// Или просто распознать без обновления
const result = await service.recognizeDocument(mediaUuid)
```

**Извлекаемые поля:**
- `fullName` - ФИО
- `birthday` - дата рождения
- `sex` - пол (M/F)
- `passportSeries` - серия паспорта
- `passportNumber` - номер паспорта
- `passportIssueDate` - дата выдачи
- `passportIssuedBy` - кем выдан
- `registrationAddress` - адрес регистрации

### 3. Passport Selfie Verification Service

Проверяет, что пользователь держит свой паспорт на селфи.

```typescript
import { 
  PassportSelfieVerificationService, 
  GoogleVisionProvider 
} from '@/shared/services/recognition'

// Инициализация (можно использовать один провайдер для обоих интерфейсов)
const provider = new GoogleVisionProvider(process.env.GOOGLE_VISION_API_KEY!)
const service = new PassportSelfieVerificationService(
  provider, // IFaceRecognitionProvider
  provider  // IOcrProvider
)

// Или с AWS
const awsProvider = new AwsRekognitionProvider({...})
const service = new PassportSelfieVerificationService(awsProvider, awsProvider)

// Верификация
const result = await service.verifySelfieWithPassport(
  selfieMediaUuid,    // UUID селфи
  passportMediaUuid,  // UUID паспорта
  humanUuid           // UUID пользователя
)

if (result.verified) {
  console.log('Верификация пройдена!')
  console.log('Совпадение лиц:', result.faceMatch.similarity)
  console.log('Совпадение имён:', result.nameMatch.similarity)
} else {
  console.log('Верификация не пройдена:', result.reasons)
}
```

**Результат:**
```typescript
interface PassportSelfieVerificationResult {
  verified: boolean
  faceMatch: {
    match: boolean
    similarity: number
    confidence: number
  }
  nameMatch: {
    match: boolean
    passportName?: string
    userName?: string
    similarity?: number
  }
  details: {
    facesDetectedInSelfie: number
    facesDetectedInPassport: number
    passportNameExtracted: boolean
    errors?: string[]
  }
  reasons?: string[]
}
```

## Пример использования в API Route

```typescript
// apps/site/src/app/api/altrp/v1/c/verify-selfie/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { 
  PassportSelfieVerificationService,
  GoogleVisionProvider,
  AwsRekognitionProvider
} from '@/shared/services/recognition'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const selfieMediaUuid = formData.get('selfieUuid') as string
  const passportMediaUuid = formData.get('passportUuid') as string
  const humanUuid = formData.get('humanUuid') as string

  // Выбор провайдера на основе env
  
  const provider = new GoogleVisionProvider(process.env.GOOGLE_VISION_API_KEY!)
  

  const service = new PassportSelfieVerificationService(provider, provider)
  const result = await service.verifySelfieWithPassport(
    selfieMediaUuid,
    passportMediaUuid,
    humanUuid
  )

  return NextResponse.json(result)
}
```

## Настройка окружения

### Для Google Vision

```env
GOOGLE_VISION_API_KEY=your_google_api_key_here
```

### Для AWS Rekognition

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

### Переключение между провайдерами

```env
# Optional: выбор провайдера
USE_AWS_REKOGNITION=false  # true для AWS, false для Google
```

## Сравнение провайдеров

| Функция | Google Vision | AWS Rekognition |
|---------|--------------|-----------------|
| Face Detection | ✅ | ✅ |
| Face Comparison | ⚠️ Ручная реализация | ✅ Встроенный CompareFaces |
| OCR | ✅ DOCUMENT_TEXT_DETECTION | ✅ DetectText |
| Точность лиц | Хорошая | Отличная |
| Точность OCR | Отличная | Хорошая |
| Стоимость | $1.50/1000 запросов | $1.00/1000 изображений |

**Рекомендация:** 
- **AWS Rekognition** - лучше для сравнения лиц (встроенный CompareFaces)
- **Google Vision** - лучше для OCR документов (особенно кириллица)
- Можно комбинировать: AWS для лиц, Google для OCR

## Комбинированное использование

```typescript
// Лучшее из обоих миров
const awsProvider = new AwsRekognitionProvider({...})
const googleProvider = new GoogleVisionProvider(process.env.GOOGLE_VISION_API_KEY!)

// AWS для сравнения лиц, Google для OCR
const service = new PassportSelfieVerificationService(
  awsProvider,    // Для face matching
  googleProvider  // Для OCR
)
```

