export const EXTRACT_PASSPORT_DATA_PROMPT = `
Human:

<SOURCE>
<%description%>
</SOURCE>

You are given OCR text from a Russian internal passport (страница с основными данными).
Extract ONLY the fields that correspond to the user profile fields in our system and return
them as a single JSON object, without any explanation or comments.

The JSON MUST have exactly these keys:

- fullName: full name in Russian as it appears in the passport, format "Фамилия Имя Отчество" (if patronymic is missing, use "Фамилия Имя"). If you cannot detect the name, use null.
- birthday: date of birth in format YYYY-MM-DD (if you cannot detect the date, use null).

Output rules:
- Output MUST be a single valid JSON object.
- Keys MUST be: "fullName" and "birthday".
- Do not add any extra fields.
- Do not add comments or explanations.

Start immediately with the JSON object, for example:
{"fullName": "Иванов Иван Иванович", "birthday": "1990-01-01"}
`

export const buildExtractPassportDataPrompt = (description: string) => {
  return EXTRACT_PASSPORT_DATA_PROMPT.replaceAll('<%description%>', description)
}

// ===== Income certificate parsing =====
export const EXTRACT_INCOME_CERTIFICATE_PROMPT = `
Human:

<SOURCE>
<%description%>
</SOURCE>

You are given OCR text from an income certificate (справка о доходах).
Extract ONLY the fields listed below and return them as a single JSON object,
without any explanations or extra keys.

The JSON MUST have exactly these keys:
- fullName: employee full name (as written), or null if not found.
- employerName: organization / employer name, or null.
- position: job title/position, or null.
- monthlyIncome: monthly income amount as number (digits only, no currency), or null.
- periodFrom: period start date in YYYY-MM-DD if present, otherwise null.
- periodTo: period end date in YYYY-MM-DD if present, otherwise null.
- issueDate: certificate issue date in YYYY-MM-DD if present, otherwise null.
- currency: currency code or sign if present (e.g., "RUB"), otherwise null.

Output rules:
- Output MUST be a single valid JSON object.
- Keys MUST match exactly the list above.
- Do not add any other fields, comments, or text.
- If a value is missing, use null.

Start immediately with the JSON object, for example:
{"fullName": "Иванов Иван Иванович", "employerName": "ООО Ромашка", "position": "Менеджер", "monthlyIncome": 75000, "periodFrom": "2024-01-01", "periodTo": "2024-06-30", "issueDate": "2024-07-01", "currency": "RUB"}
`

export const buildExtractIncomeCertificatePrompt = (description: string) => {
  return EXTRACT_INCOME_CERTIFICATE_PROMPT.replaceAll('<%description%>', description)
}