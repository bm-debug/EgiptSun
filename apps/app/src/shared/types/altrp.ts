import {
    Deal,
    User,
    Human,
    NewDeal,
    NewHuman,
    Journal,
    NewJournal,
    Employee,
    NewUser,
    NewText,
    Text,
    Relation,
    NewRelation,
    Role,
} from '../schema/types'
import { altrpMedia } from './altrp-finance'

export interface altrpHuman extends Human {
    dataIn: altrpHumanData
    user?: altrpUser
}

export interface altrpUser extends User {
    human?: altrpHuman
}

export interface NewaltrpHuman extends NewHuman {
    dataIn: altrpHumanData
}

export interface altrpHumanData {
    phone?: string
    avatarMedia?: Partial<altrpMedia> | null
    firstName?: string
    lastName?: string
    middleName?: string
}

export interface DealDataIn {
    type: string
}

/**
 * пользователь
 */
export interface altrpUser extends User {
    dataIn: altrpUserData
}
export interface NewaltrpUser extends NewUser {
    dataIn: altrpUserData
}
export interface EmailVerificationState {
    tokenHash?: string
    expiresAt?: string
    lastSentAt?: string
}

export interface altrpUserData {
    emailVerification?: EmailVerificationState
    [key: string]: unknown
}
export interface altrpJournal extends Journal {
}
export interface NewaltrpJournal extends NewJournal {
}
export interface altrpJournalDataIn {
    [key: string]: unknown
}
export interface altrpUserJournal extends altrpJournal {
    action: altrpUserJournalActions
    details: altrpUserJournalDetails

}
export interface NewaltrpUserJournal extends NewaltrpJournal {
    action: altrpUserJournalActions
    details: altrpUserJournalDetails
}
export type altrpUserJournalActions = 
    'USER_JOURNAL_REGISTRATION' |
    'USER_JOURNAL_LOGIN' |
    'USER_JOURNAL_LOGOUT' |
    'USER_JOURNAL_EMAIL_VERIFICATION' |
    'USER_JOURNAL_PASSWORD_RESET_REQUEST' |
    'USER_JOURNAL_PASSWORD_RESET_CONFIRM' |
    'USER_JOURNAL_PASSWORD_RESET' |
    'USER_JOURNAL_SELFIE_VERIFICATION' |
    'USER_JOURNAL_WALLET_DEPOSIT' |
    'USER_JOURNAL_FINANCE_PAID' |
    'USER_JOURNAL_SUPPORT_CHAT_CREATED' |
    'USER_JOURNAL_ADMIN_OCR_OVERRIDE'
export interface altrpUserJournalDetails {
    user: {
        uuid: string
        email: string
        humanAid?: string | null
    }
    [key: string]: unknown
}
/**
 * форма на странице инвестора
 */
export interface InvestorsFormDeal extends Deal {
    dataIn: InvestorsFormDealDataIn
}

export interface NewInvestorsFormDeal extends NewDeal {
    dataIn: InvestorsFormDealDataIn
}
export interface InvestorsFormDealDataIn {
    type: 'INVESTORS_FORM'
    formData: InvestorsFormData
}
/**
 * Данный из формы на странице /investors
 * 
 */
export interface InvestorsFormData {
    name: string
    phone: string
    email: string
}

/**
 * guarantor
 */
export interface GuarantorRelationDataIn {
    guarantorFullName?: string
    guarantorPhone?: string
    guarantorRelationship?: string
    guarantorIncome?: string
}

export interface GuarantorRelation extends Omit<Relation, 'dataIn'> {
    type: 'GUARANTOR'
    sourceEntity: LoanApplication['daid']
    targetEntity: altrpHuman['haid']
    dataIn?: GuarantorRelationDataIn | null
}
export interface NewGuarantorRelation extends Omit<NewRelation, 'dataIn'> {
    type: 'GUARANTOR'
    sourceEntity: LoanApplication['daid']
    targetEntity: altrpHuman['haid']
    dataIn?: GuarantorRelationDataIn | null
}

export interface GuarantorHuman extends altrpHuman {
    dataIn: GuarantorHumanDataIn
}
export interface NewGuarantorHuman extends NewaltrpHuman {
    dataIn: GuarantorHumanDataIn
}
export interface GuarantorHumanDataIn extends altrpHumanData {
    phone: string
}
/**
 * заявки обработка и формирование платежей через финансы
 */



export interface LoanApplication extends Deal {
    dataIn: LoanApplicationDataIn
    statusName: LoanApplicationStatus
    guarantors?: GuarantorHuman[]
    documents?: any[]

}

export interface NewLoanApplication extends NewDeal {
    dataIn: LoanApplicationDataIn
    statusName: LoanApplicationStatus
    documents?: any[]
}


export interface LoanApplicationDataIn {
    type: 'LOAN_APPLICATION'
    managerUuid?: altrpUser['uuid']
    firstName: string
    lastName: string
    phone: string
    email: string
    productPrice: string
    term: number[]
    decision?: LoanApplicationDecision
    additionalInfoRequest?: AdditionalInfoRequest
    // Priority fields
    priority?: 'low' | 'medium' | 'high'
    priorityReason?: string
    priorityUpdatedAt?: string
    priorityUpdatedByUserUuid?: string
    // Additional optional fields
    middleName?: string
    productName?: string
    purchaseLocation?: string
    downPayment?: string
    comfortableMonthlyPayment?: string
    monthlyPayment?: string
    partnerLocation?: string
    convenientPaymentDate?: string
    // Financial information (Security Review - СБ)
    officialIncome_sb?: string
    additionalIncome_sb?: string
    employmentInfo_sb?: string
    // Guarantor (optional, provided by client form)
    guarantorFullName?: string
    guarantorPhone?: string
    guarantorRelationship?: string
    guarantorIncome?: string
    guarantorAid?: string
    // New fields for deal details
    purchasePrice?: string // За сколько купил (закупочная цена)
    salePrice?: string // За сколько продал (явно выделено из productPrice)
    curatorUuid?: string // Куратор (отдельно от managerUuid)
    createdByUuid?: string // Кто оформил
    approvedByUuid?: string // Кто одобрил
    rejectionReason?: string // Причина отказа
    isNewClient?: boolean // Клиент новый?
    productCategory?: string // Категория товара
    partner?: string // Партнер
    hasPurchaseAgreement?: boolean // Письменный договор купли-продажи?
    clientSource?: string // Откуда пришел клиент
    guarantorAgreementPhotos?: string[] // Фото договора поручительства
    purchaseAgreementPhotos?: string[] // Фото договора купли-продажи
    isBlacklisted?: boolean // Черный список
    isProcessed?: boolean // Обработано
    markupAmount?: string // Накидка (руб)
    markupPercent?: string // Накидка (%)
    downPaymentPercent?: string // Взнос (%)
    remainingMarkupPercent?: string // Накидка на ост. (%)
    monthlyMarkup?: string // Наценка в мес
    remainingMonthlyMarkup?: string // Ост. Нац. в мес.
    [key: string]: any // Allow additional fields for flexibility
}

export interface AdditionalInfoRequest {
    comment: string
}

export interface JournalLoanApplicationSnapshot extends Journal {
    action: 'LOAN_APPLICATION_SNAPSHOT' | 'DEAL_APPROVED' | 'DEAL_STATUS_CHANGE' | 'DEAL_REJECTED' | 'DEAL_CANCELLED'
    userId?: User['id']
    details: LoanApplicationSnapshotDetails
}
export interface NewJournalLoanApplicationSnapshot extends NewJournal {
    action: 'LOAN_APPLICATION_SNAPSHOT' | 'DEAL_APPROVED' | 'DEAL_STATUS_CHANGE' | 'DEAL_REJECTED' | 'DEAL_CANCELLED'
    userId?: User['id']
    details: LoanApplicationSnapshotDetails
}

export interface LoanApplicationSnapshotDetails {
    snapshot: LoanApplication
    previousSnapshot: LoanApplication | null
    description?: string
    statusName?: string
}

export type LoanApplicationDeal = LoanApplication

// Deal lifecycle statuses
export type DealStatus =
    | 'NEW'
    | 'SCORING'
    | 'INFO_REQUESTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'ACTIVE'
    | 'COMPLETED'
    | 'OVERDUE'
// Deal lifecycle statuses
export type LoanApplicationStatus =
    | 'NEW'
    | 'SCORING'
    | 'APPROVED'
    | 'CANCELLED'
    | 'REJECTED'
    | 'ACTIVE'
    | 'ADDITIONAL_INFO_REQUESTED'

export interface LoanApplicationDecision {
    securityServiceComment?: string
}
export interface FinanceParameters {

}
export interface PaymentScheduleItem {

}
export interface FinanceSchedule {

}
export interface GenerateFinanceScheduleInput {

}
export interface GenerateFinanceScheduleResult {

}

// export interface LoanApplicationJournal extends Journal{
//     action: 'DEAL_STATUS_TRANSITION'
//     details: DealStatusTransition
// }
// export interface NewLoanApplicationJournal extends NewJournal{
//     action: 'DEAL_STATUS_TRANSITION'
//     details: DealStatusTransition
// }
// export interface DealStatusTransition{
//     type: 'DEAL_STATUS_TRANSITION'
//     dealId: Deal['id']
//     from: DealStatus
//     to: DealStatus
//     performedByUserId: User['id']
//     performedAt: string // ISO datetime
//     reason?: string
//     comment?: string
//     source?: 'MANUAL' | 'SYSTEM' | 'AUTO_RULE'
//     journalId?: Journal['id']
// }
/**
 * taxonomy
 */

export interface TaxonomyOption {
    id: number
    entity: string
    name: string
    title: string | null
    sortOrder: number | null
}

export interface TaxonomyResponse {
    docs: TaxonomyOption[]
}

/**
 * клиент
 */

export type ClientStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface Client extends altrpHuman {
    dataIn: ClientDataIn
    statusName: ClientStatus
    type: 'CLIENT'
}
export interface NewClient extends NewaltrpHuman {
    dataIn: ClientDataIn
    statusName: ClientStatus
    type: 'CLIENT'
}
/**
 * Investor
 */
export interface Investor extends altrpHuman {
    dataIn: InvestorDataIn
    statusName: InvestorStatus
    type: 'INVESTOR'
    haid: string
}
export interface NewInvestor extends NewaltrpHuman {
    dataIn: InvestorDataIn
    statusName: InvestorStatus
    type: 'INVESTOR'
    haid: string
}
export interface InvestorDataIn extends altrpHumanData {
    kycStatus?: KycStatus
    kycDocuments?: KycDocumentRef[]
}
export type InvestorStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
  
/**
 * KYC Status types
 */
export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected' | 'more_info'

/**
 * KYC Document Reference
 */
export interface KycDocumentRef {
    mediaUuid: string
    type: 'passport_main' | 'passport_registration' | 'selfie' | 'selfie_with_passport' | 'other'
    uploadedAt: string // ISO string
    verificationResult?: {
        facesMatch?: boolean
        confidence?: number
        details?: string
    }
}

export interface ClientDataIn extends altrpHumanData {
    kycStatus?: KycStatus
    kycDocuments?: KycDocumentRef[]
    guarantor1Haid?: string // HAID первого поручителя
    guarantor2Haid?: string // HAID второго поручителя
}

/**
 * API Response types
 */
export interface UploadAssetResponse {
    success: boolean
    asset: {
        uuid: string
        url: string // /api/altrp/v1/c/assets/uuid-filename.ext
        mimeType: string
        fileName: string
    }
}

export interface UpdateProfileKycRequest {
    kycDocuments: KycDocumentRef[]
}

export interface altrpText extends Text {
    dataIn: altrpTextDataIn
}
export interface NewaltrpText extends Partial<NewText> {
    dataIn: altrpTextDataIn
}

export interface altrpTextDataIn {
    slug: string
    date: string
    author: string
    readTime: number
    /** Locale code (e.g. en, ru). Null/absent = default language. */
    locale?: string | null
}

/**
 * ROLES
 */

export interface AltrpRole extends Role{
    dataIn: AltrpRoleDatain
}
export interface AltrpRoleDatain{
    auth_redirect_url?: string
}