import BaseRepository from "./BaseRepositroy";
import {
    Deal,
    NewDeal,
} from '../schema/types'
import {
    schema
} from '../schema'
import { generateAid } from "../generate-aid";
import {
    InvestorsFormDeal,
    InvestorsFormData,
    LoanApplicationDeal,
    LoanApplicationDataIn,
    NewInvestorsFormDeal,
    NewLoanApplication,
    LoanApplication,
    JournalLoanApplicationSnapshot,
    Client,
    LoanApplicationDecision,
} from "../types/altrp";
import { DbFilters, DbOrders, DbPagination, DbPaginatedResult } from "../types/shared";
import { buildDbFilters, buildDbOrders, withNotDeleted } from "./utils";
import { eq, sql, or, like, and, isNull, inArray } from "drizzle-orm";
import { JournalsRepository } from "./journals.repository";
import { HumanRepository } from "./human.repository";
import { UsersRepository } from "./users.repository";
import { UserRolesRepository } from "./user-roles.repository";
import { preparePassword } from "../password";
import { FinancesRepository } from "./finances.repository";
import { NoticesRepository } from "./notices.repository";
import {
    PaymentScheduleInput,
    PaymentLimitsConfig,
    IsoDate,
    FinanceDataIn,
} from "../types/altrp-finance";
import { ScoringWeights } from "../types/scoring";
import { SettingsRepository } from "./settings.repository";
import { buildAdminNewLoanApplicationEmailHtml } from "../services/email-templates.service";
import { sendToRoom } from "@/lib/socket";

const ADMIN_CONTACT_MESSAGE = ' Пожалуйста, свяжитесь с администратором системы.';
const INTERNAL_DECISION_ERROR_MESSAGE = `Произошла внутренняя ошибка при обработке решения.${ADMIN_CONTACT_MESSAGE}`;

export class DealsRepository extends BaseRepository<Deal>{
    
    constructor() {
        super(schema.deals)
    }

    public static getInstance(): DealsRepository {
        return new DealsRepository();
    }

    protected async beforeCreate(data: Partial<NewDeal>): Promise<void> {
        if(! data.fullDaid){
            data.fullDaid = generateAid('d')
        }
    }
    protected async beforeUpdate(uuid: string, data: Partial<NewDeal>): Promise<void> {
        if(! data.fullDaid){
            data.fullDaid = generateAid('d')
        }
    }

    public async createInvestorsFormDeal(formData: InvestorsFormData): Promise<InvestorsFormDeal> {
        const sanitizedFormData: InvestorsFormData = {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim(),
        }

        const newDeal: NewInvestorsFormDeal = {
            uuid: crypto.randomUUID(),
            daid: generateAid('d'),
            title: sanitizedFormData.name
                ? `Investors form - ${sanitizedFormData.name}`
                : 'Investors form',
            statusName: 'NEW',
            dataIn: {
                type: 'INVESTORS_FORM',
                formData: sanitizedFormData,
            },
        }

        const createdDeal = await this.create(newDeal)

        return createdDeal as InvestorsFormDeal
    }
    /**
     * прием заявки с формы на сайте
     */
    public async createLoanApplicationDealPublic(formData: LoanApplicationDataIn): Promise<{
        createdDeal: LoanApplicationDeal
        journal: JournalLoanApplicationSnapshot
        client: Client
    }> {
        const sanitizedFormData: LoanApplicationDataIn = {
            type: 'LOAN_APPLICATION',
            firstName: formData.firstName?.trim() ?? '',
            lastName: formData.lastName?.trim() ?? '',
            phone: formData.phone?.trim() ?? '',
            email: formData.email?.trim().toLowerCase() ?? '',
            productPrice: formData.productPrice?.trim() ?? '',
            term: Array.isArray(formData.term)
                ? formData.term
                    .map((value) => Number(value))
                    .filter((value) => Number.isFinite(value))
                : [],
            // Optional fields
            ...(formData.middleName && { middleName: formData.middleName.trim() }),
            ...(formData.productName && { productName: formData.productName.trim() }),
            ...(formData.purchaseLocation && { purchaseLocation: formData.purchaseLocation.trim() }),
            ...(formData.downPayment && { downPayment: formData.downPayment.trim() }),
            ...(formData.comfortableMonthlyPayment && { comfortableMonthlyPayment: formData.comfortableMonthlyPayment.trim() }),
            ...(formData.monthlyPayment && { monthlyPayment: formData.monthlyPayment.trim() }),
            ...(formData.partnerLocation && { partnerLocation: formData.partnerLocation.trim() }),
            ...(formData.convenientPaymentDate && { convenientPaymentDate: formData.convenientPaymentDate.trim() }),
            // Financial information (Security Review - СБ)
            ...(formData.officialIncome_sb && { officialIncome_sb: formData.officialIncome_sb.trim() }),
            ...(formData.additionalIncome_sb && { additionalIncome_sb: formData.additionalIncome_sb.trim() }),
            ...(formData.employmentInfo_sb && { employmentInfo_sb: formData.employmentInfo_sb.trim() }),
            ...(formData.monthlyIncome && { monthlyIncome: formData.monthlyIncome.trim() }),
            ...(formData.monthlyExpenses && { monthlyExpenses: formData.monthlyExpenses.trim() }),
            ...(formData.workPlace && { workPlace: formData.workPlace.trim() }),
            ...(formData.workExperience && { workExperience: formData.workExperience.trim() }),
            // Guarantor (optional)
            ...(formData.guarantorFullName && { guarantorFullName: formData.guarantorFullName.trim() }),
            ...(formData.guarantorPhone && { guarantorPhone: formData.guarantorPhone.trim() }),
            ...(formData.guarantorRelationship && { guarantorRelationship: formData.guarantorRelationship.trim() }),
            ...(formData.guarantorIncome && { guarantorIncome: formData.guarantorIncome.trim() }),
            ...(formData.guarantorAid && { guarantorAid: formData.guarantorAid.trim() }),
        }

        const missingFields: string[] = []

        if (!sanitizedFormData.firstName) missingFields.push('firstName')
        if (!sanitizedFormData.lastName) missingFields.push('lastName')
        if (!sanitizedFormData.phone) missingFields.push('phone')
        if (!sanitizedFormData.email) missingFields.push('email')
        if (!sanitizedFormData.productPrice) missingFields.push('productPrice')
        if (!sanitizedFormData.term.length) missingFields.push('term')

        if (missingFields.length) {
            throw new Error(`Отсутствуют обязательные поля LoanApplicationDataIn: ${missingFields.join(', ')}.${ADMIN_CONTACT_MESSAGE}`)
        }

        const applicantName = `${sanitizedFormData.firstName} ${sanitizedFormData.lastName}`.trim()
        
        // Build title with product name if available
        let dealTitle = 'Заявка на кредит'
        if (sanitizedFormData.productName) {
            dealTitle = `${sanitizedFormData.productName}`
            if (applicantName) {
                dealTitle += ` - ${applicantName}`
            }
        } else if (applicantName) {
            dealTitle = `Заявка на кредит - ${applicantName}`
        }

        const newDeal: NewLoanApplication = {
            uuid: crypto.randomUUID(),
            daid: generateAid('d'),
            title: dealTitle,
            statusName: 'NEW',
            dataIn: sanitizedFormData,
        }

        const humanRepository = HumanRepository.getInstance()
        
        // Prepare human dataIn with financial information from deal
        // generateClientByEmail will merge this with existing dataIn
        const humanDataIn: Record<string, unknown> = {
            phone: sanitizedFormData.phone,
            // Финансовая информация из заявки (будет объединена с существующими данными)
            ...(sanitizedFormData.employmentInfo_sb && { employmentInfo_sb: sanitizedFormData.employmentInfo_sb }),
            ...(sanitizedFormData.officialIncome_sb && { officialIncome_sb: sanitizedFormData.officialIncome_sb }),
            ...(sanitizedFormData.additionalIncome_sb && { additionalIncome_sb: sanitizedFormData.additionalIncome_sb }),
        }

        const client = await humanRepository.generateClientByEmail(sanitizedFormData.email, {
            fullName: applicantName,
            dataIn: humanDataIn
        }) as Client
        newDeal.clientAid = client.haid
        const createdDeal = await this.create(newDeal) as LoanApplication
        
        // Проверка стоп-факторов (Фаза 1 алгоритма скоринга)
        const rejectionReason = await this.checkStopFactors(createdDeal);
        if (rejectionReason) {
            // Обновляем статус на REJECTED и добавляем причину в dataOut
            const updatedDeal = await this.update(createdDeal.uuid, {
                statusName: 'REJECTED',
                dataOut: {
                    rejection_reason: rejectionReason,
                },
            }) as LoanApplication;
            
            const journalsRepository = JournalsRepository.getInstance()
            const journal = await journalsRepository.createLoanApplicationSnapshot(updatedDeal as LoanApplication, createdDeal, null)
            
            // Ensure user with 'client' role exists
            await this.ensureClientUser(sanitizedFormData.email, client)
            
            return {
                createdDeal: updatedDeal,
                journal,
                client,
            }
        }
        
        // Фаза 2 и 3: Если стоп-факторов нет, запускаем алгоритм скоринга
        const calculatedScore = await this.calculateScore(createdDeal);
        const updatedDeal = await this.update(createdDeal.uuid, {
            statusName: 'SCORING',
            dataOut: {
                scoring_result: {
                    score: calculatedScore,
                    red_flags_checked: true,
                },
            },
        }) as LoanApplication;
        
        const journalsRepository = JournalsRepository.getInstance()
        const journal = await journalsRepository.createLoanApplicationSnapshot(updatedDeal as LoanApplication, createdDeal, null)

        // Уведомление всех администраторов о новой заявке
        try {
            const noticesRepository = NoticesRepository.getInstance()
            const admins = await this.getAdminHumans()

            if (admins.length) {
                const clientName = applicantName || 'Клиент'
                const emailSubject = 'Новая заявка на рассрочку'
                const termText = `${sanitizedFormData.term.join(', ')} месяцев`
                const productPriceNumber = Number(sanitizedFormData.productPrice)
                const emailBody = buildAdminNewLoanApplicationEmailHtml({
                    dealAid: updatedDeal.daid,
                    clientName,
                    productPrice: isNaN(productPriceNumber) ? 0 : productPriceNumber,
                    termText,
                    productName: sanitizedFormData.productName,
                })

                const pushTitle = 'Новая заявка на рассрочку'
                const pushBody = `Поступила новая заявка №${updatedDeal.daid} от ${clientName}.`

                await Promise.all(
                    admins.map((admin) =>
                        Promise.all([
                            noticesRepository
                                .sendEmail(admin.haid, emailSubject, emailBody)
                                .catch((err) => console.error('Failed to send admin email notification:', err)),
                            noticesRepository
                                .sendPushNotification(admin.haid, pushTitle, pushBody, `${process.env.PUBLIC_SITE_URL}/admin/deals`)
                                .catch((err) => console.error('Failed to send admin push notification:', err)),
                        ])
                    )
                )
            }
        } catch (error) {
            console.error('Failed to send admin notifications for new loan application:', error)
            // Не прерываем основной процесс создания заявки из‑за ошибок уведомлений
        }

        // Отправить сигнал админам об обновлении уведомлений (новая заявка добавлена)
        await sendToRoom('admin', 'update-admin', {
            type: 'admin-updated-notices',
        }).catch((err) => {
            console.error('Failed to send admin-updated-notices socket event:', err);
        });

        // Ensure user with 'client' role exists
        await this.ensureClientUser(sanitizedFormData.email, client)
        
        return {
            createdDeal: updatedDeal,
            journal,
            client,
        }
    }

    /**
     * Ensure user with 'client' role exists for the given email and client
     * Creates a new user if one doesn't exist, or assigns 'client' role if user exists
     */
    private async ensureClientUser(email: string, client: Client): Promise<void> {
        const usersRepository = UsersRepository.getInstance()
        const userRolesRepository = UserRolesRepository.getInstance()

        // Check if user already exists
        const existingUser = await usersRepository.findByEmail(email)

        if (!existingUser) {
            // Generate random password for the new user
            const randomPassword = this.generateRandomPassword()
            const { hashedPassword, salt } = await preparePassword(randomPassword)

            // Create user
            await usersRepository.create({
                humanAid: client.haid,
                email: email,
                passwordHash: hashedPassword,
                salt,
                isActive: true,
            })

            // Assign 'client' role to the user
            const newUser = await usersRepository.findByEmail(email)
            if (newUser) {
                await userRolesRepository.assignRolesToUserByNames(newUser.uuid, ['client'])
            }
        } else {
            // If user exists, ensure they have 'client' role
            await userRolesRepository.assignRolesToUserByNames(existingUser.uuid, ['client'])
        }
    }

    /**
     * Generate a random password for new users
     */
    private generateRandomPassword(): string {
        const length = 16
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
        const values = crypto.getRandomValues(new Uint8Array(length))
        return Array.from(values, (x) => charset[x % charset.length]).join('')
    }

    /**
     * Проверяет стоп-факторы для новой заявки согласно ТЗ
     * @param deal - заявка на кредит
     * @returns причина отклонения или null, если стоп-факторов нет
     */
    private async checkStopFactors(deal: LoanApplication): Promise<string | null> {
        const dataIn = this.normalizeLoanApplicationDataIn(deal.dataIn);

        // Фаза 1: Проверка суммы
        const productPrice = Number(dataIn.productPrice);
        if (isNaN(productPrice)) {
            return "Сумма заявки указана некорректно";
        }

        if (productPrice < 3000 || productPrice > 300000) {
            return "Сумма не соответствует лимитам (должна быть от 3,000 ₽ до 300,000 ₽)";
        }

        // Фаза 1: Проверка на наличие активных просрочек
        if (deal.clientAid) {
            const financesRepository = FinancesRepository.getInstance();
            // clientAid хранится в dataIn (JSONB), поэтому используем SQL для поиска
            // Нужно явно привести к jsonb типу для работы оператора ->>
            const overdueFinances = await financesRepository.getSelectQuery()
                .where(
                    and(
                        sql`${financesRepository.schema.dataIn}::jsonb->>'clientAid' = ${deal.clientAid}`,
                        eq(financesRepository.schema.statusName, 'OVERDUE'),
                        isNull(financesRepository.schema.deletedAt)
                    )
                )
                .execute();

            if (overdueFinances.length > 0) {
                return "Имеется активная просроченная задолженность";
            }
        }

        // Проверка возраста пока пропускаем, так как нет данных о возрасте в LoanApplicationDataIn
        // TODO: Добавить проверку возраста, когда будет доступна информация о дате рождения

        return null; // Стоп-факторы не найдены
    }

    /**
     * Рассчитывает скоринговый балл для заявки на кредит
     * @param deal - заявка на кредит
     * @returns рассчитанный балл
     */
    private async calculateScore(deal: LoanApplication): Promise<number> {
        try {
            // Получаем веса из настроек
            const settingsRepository = SettingsRepository.getInstance();
            const weightsSetting = await settingsRepository.findByAttribute('scoring.weights');
            
            if (!weightsSetting || !weightsSetting.dataIn) {
                console.warn('Scoring weights not found, using default initial score: 500');
                return 500;
            }

            const weights = typeof weightsSetting.dataIn === 'string' 
                ? JSON.parse(weightsSetting.dataIn) as ScoringWeights
                : weightsSetting.dataIn as ScoringWeights;

            // Начальный балл
            let score = weights.initialScore || 500;

            // Нормализуем dataIn
            const dataIn = this.normalizeLoanApplicationDataIn(deal.dataIn);
            const dataInExtended = dataIn as LoanApplicationDataIn & Record<string, any>;

            // Модификатор семейного положения
            const maritalStatus = (dataInExtended.maritalStatus || dataInExtended.maritalStatus_sb || '').toLowerCase();
            if (maritalStatus.includes('женат') || maritalStatus.includes('замужем') || maritalStatus.includes('married')) {
                score += weights.modifiers.maritalStatus.married || 0;
            } else if (maritalStatus.includes('разведен') || maritalStatus.includes('разведена') || maritalStatus.includes('divorced')) {
                score += weights.modifiers.maritalStatus.divorced || 0;
            }

            // Модификатор дохода
            const incomeStr = dataInExtended.officialIncome_sb || dataInExtended.employmentIncome_sb || '';
            const incomeMatch = incomeStr.match(/[\d\s]+/);
            if (incomeMatch) {
                const income = parseInt(incomeMatch[0].replace(/\s/g, ''), 10);
                if (!isNaN(income)) {
                    if (income >= (weights.modifiers.income.high.threshold || 100000)) {
                        score += weights.modifiers.income.high.value || 0;
                    } else if (income <= (weights.modifiers.income.low.threshold || 40000)) {
                        score += weights.modifiers.income.low.value || 0;
                    }
                }
            }

            // Модификатор кредитной истории
            const creditHistory = (dataInExtended.creditHistory_sb || '').toLowerCase();
            const negativeKeywords = weights.modifiers.creditHistory.negativeKeywords || [];
            const hasNegativeKeywords = negativeKeywords.some(keyword => 
                creditHistory.includes(keyword.toLowerCase())
            );
            if (hasNegativeKeywords) {
                score += weights.modifiers.creditHistory.value || 0;
            }

            // Модификатор поручителей
            if (dataInExtended.fullName_p1 && dataInExtended.fullName_p1.trim()) {
                score += weights.modifiers.guarantors.guarantor1 || 0;
            }
            if (dataInExtended.fullName_p2 && dataInExtended.fullName_p2.trim()) {
                score += weights.modifiers.guarantors.guarantor2 || 0;
            }

            return Math.max(0, Math.round(score)); // Округляем и не допускаем отрицательных значений
        } catch (error) {
            console.error('Ошибка при расчете скорингового балла:', error);
            // В случае ошибки возвращаем базовый балл
            return 500;
        }
    }

    /**
     * Привязывает документы к сделке
     * @param dealUuid - UUID сделки
     * @param documentUuids - Массив UUID документов из Media
     */
    public async attachDocumentsToDeal(dealUuid: string, documentUuids: string[]): Promise<void> {
        const deal = await this.findByUuid(dealUuid) as LoanApplication | null;
        if (!deal) {
            throw new Error(`Сделка с UUID ${dealUuid} не найдена`);
        }

        // Get current dataIn
        const currentDataIn = this.normalizeLoanApplicationDataIn(deal.dataIn);
        const dataInExtended = currentDataIn as LoanApplicationDataIn & Record<string, any>;

        // Update dataIn with document UUIDs
        const updatedDataIn: LoanApplicationDataIn & Record<string, any> = {
            ...dataInExtended,
            documentPhotos: documentUuids,
        };

        // Update deal
        await this.update(dealUuid, {
            dataIn: updatedDataIn,
        });
    }

    /**
     * обновление заявки на кредит
     * @param uuid - uuid заявки на кредит
     */
    private normalizeLoanApplicationDataIn(rawDataIn: LoanApplication['dataIn']): LoanApplicationDataIn {
        if (typeof rawDataIn === 'string') {
            try {
                return JSON.parse(rawDataIn) as LoanApplicationDataIn;
            } catch {
                throw new Error(`Поле dataIn должно содержать корректный JSON.${ADMIN_CONTACT_MESSAGE}`);
            }
        }

        if (rawDataIn && typeof rawDataIn === 'object') {
            return rawDataIn as LoanApplicationDataIn;
        }

        throw new Error(`Поле dataIn должно быть объектом.${ADMIN_CONTACT_MESSAGE}`);
    }
    private isValidUuid(value: string): boolean {
        const uuid = value.trim();
        const uuidV4Regex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidV4Regex.test(uuid);
    }

    private async ensureEmployeeExists(uuid: string): Promise<void> {
        try {
            // Check if user exists
            const [user] = await this.db
                .select({ uuid: schema.users.uuid })
                .from(schema.users)
                .where(eq(schema.users.uuid, uuid))
                .limit(1)
                .execute();

            if (!user) {
                throw new Error(INTERNAL_DECISION_ERROR_MESSAGE);
            }

            // Get user roles
            const userRoleAssociations = await this.db
                .select()
                .from(schema.userRoles)
                .where(eq(schema.userRoles.userUuid, uuid))
                .execute();

            if (!userRoleAssociations.length) {
                throw new Error(INTERNAL_DECISION_ERROR_MESSAGE);
            }

            // Get role UUIDs
            const roleUuids = userRoleAssociations.map((ur) => ur.roleUuid);

            // Fetch roles to check names
            const roles = await this.db
                .select()
                .from(schema.roles)
                .where(
                    and(
                        sql`${schema.roles.deletedAt} IS NULL`,
                        inArray(schema.roles.uuid, roleUuids)
                    )
                )
                .execute();

            const hasAdminRole = roles.some(
                (role) => role.name === 'admin' || role.name === 'Administrator'
            );

            if (!hasAdminRole) {
                throw new Error(INTERNAL_DECISION_ERROR_MESSAGE);
            }
        } catch (error) {
            // If table doesn't exist or query fails, throw the expected error
            if (error instanceof Error && error.message === INTERNAL_DECISION_ERROR_MESSAGE) {
                throw error;
            }
            // For any other database errors (table not found, etc.), throw the expected error
            throw new Error(INTERNAL_DECISION_ERROR_MESSAGE);
        }
    }

    /**
     * Используется для рассылки уведомлений администраторам
     */
    private async getAdminHumans(): Promise<{ haid: string; fullName: string }[]> {
        const admins = await this.db
            .select({
                haid: schema.humans.haid,
                fullName: schema.humans.fullName,
            })
            .from(schema.users)
            .innerJoin(schema.userRoles, eq(schema.userRoles.userUuid, schema.users.uuid))
            .innerJoin(schema.roles, eq(schema.roles.uuid, schema.userRoles.roleUuid))
            .innerJoin(schema.humans, eq(schema.humans.haid, schema.users.humanAid))
            .where(
                and(
                    sql`${schema.roles.deletedAt} IS NULL`,
                    sql`${schema.users.deletedAt} IS NULL`,
                    sql`${schema.humans.deletedAt} IS NULL`,
                    or(
                        eq(schema.roles.name, 'Administrator'),
                    ),
                )
            )
            .execute()

        return admins
    }

    public async updateLoanApplicationDeal(uuid: string, data: Partial<LoanApplication>): Promise<{
        updatedDeal: LoanApplication
        journal: JournalLoanApplicationSnapshot
    }> {
        if (Object.prototype.hasOwnProperty.call(data, 'dataIn')) {
            const normalizedDataIn = this.normalizeLoanApplicationDataIn(data.dataIn as LoanApplication['dataIn']);

            if (Object.prototype.hasOwnProperty.call(normalizedDataIn, 'decision')) {
                // Validate managerUuid from dataIn (not from decision)
                let managerUuid = normalizedDataIn.managerUuid;

                if (typeof managerUuid !== 'string' || !managerUuid.trim()) {
                    throw new Error(INTERNAL_DECISION_ERROR_MESSAGE);
                }

                managerUuid = managerUuid.trim();

                if (!this.isValidUuid(managerUuid)) {
                    throw new Error(INTERNAL_DECISION_ERROR_MESSAGE);
                }

                await this.ensureEmployeeExists(managerUuid);
            }
        }
        const deal = await this.findByUuid(uuid) as LoanApplication
        if(! deal) {
            throw new Error(`Сделка не найдена.${ADMIN_CONTACT_MESSAGE}`)
        }
        const updatedDeal = await this.update(uuid, data) as LoanApplication
        const journalsRepository = JournalsRepository.getInstance()
        const journal = await journalsRepository.createLoanApplicationSnapshot(updatedDeal as LoanApplication, deal, null)
        return {
            updatedDeal,
            journal,
        }
    }

    public async updateLoanApplicationDealByClientWhileScoring(
        uuid: string,
        dataIn: LoanApplicationDataIn,
        title?: string,
    ): Promise<{
        updatedDeal: LoanApplication
        journal: JournalLoanApplicationSnapshot
    }> {
        const deal = await this.findByUuid(uuid) as LoanApplication | undefined
        if (!deal) {
            throw new Error(`Сделка не найдена.${ADMIN_CONTACT_MESSAGE}`)
        }

        if (deal.statusName !== 'SCORING') {
            throw new Error('Редактирование доступно только для заявок в статусе SCORING.')
        }

        const currentDataIn = this.normalizeLoanApplicationDataIn(deal.dataIn)
        if (currentDataIn.type !== 'LOAN_APPLICATION') {
            throw new Error(`Сделка не является заявкой на кредит.${ADMIN_CONTACT_MESSAGE}`)
        }

        const sanitizedDataIn: LoanApplicationDataIn = {
            type: 'LOAN_APPLICATION',
            firstName: dataIn.firstName?.trim() ?? '',
            lastName: dataIn.lastName?.trim() ?? '',
            phone: dataIn.phone?.trim() ?? '',
            email: dataIn.email?.trim().toLowerCase() ?? '',
            productPrice: dataIn.productPrice?.trim() ?? '',
            term: Array.isArray(dataIn.term)
                ? dataIn.term
                    .map((value) => Number(value))
                    .filter((value) => Number.isFinite(value))
                : [],
            ...(dataIn.middleName && { middleName: dataIn.middleName.trim() }),
            ...(dataIn.productName && { productName: dataIn.productName.trim() }),
            ...(dataIn.purchaseLocation && { purchaseLocation: dataIn.purchaseLocation.trim() }),
            ...(dataIn.downPayment && { downPayment: dataIn.downPayment.trim() }),
            ...(dataIn.comfortableMonthlyPayment && { comfortableMonthlyPayment: dataIn.comfortableMonthlyPayment.trim() }),
            ...(dataIn.monthlyPayment && { monthlyPayment: dataIn.monthlyPayment.trim() }),
            ...(dataIn.partnerLocation && { partnerLocation: dataIn.partnerLocation.trim() }),
            ...(dataIn.convenientPaymentDate && { convenientPaymentDate: dataIn.convenientPaymentDate.trim() }),
            ...(dataIn.officialIncome_sb && { officialIncome_sb: dataIn.officialIncome_sb.trim() }),
            ...(dataIn.additionalIncome_sb && { additionalIncome_sb: dataIn.additionalIncome_sb.trim() }),
            ...(dataIn.employmentInfo_sb && { employmentInfo_sb: dataIn.employmentInfo_sb.trim() }),
            ...(dataIn.monthlyIncome && { monthlyIncome: dataIn.monthlyIncome.trim() }),
            ...(dataIn.monthlyExpenses && { monthlyExpenses: dataIn.monthlyExpenses.trim() }),
            ...(dataIn.workPlace && { workPlace: dataIn.workPlace.trim() }),
            ...(dataIn.workExperience && { workExperience: dataIn.workExperience.trim() }),
            ...(dataIn.guarantorFullName && { guarantorFullName: dataIn.guarantorFullName.trim() }),
            ...(dataIn.guarantorPhone && { guarantorPhone: dataIn.guarantorPhone.trim() }),
            ...(dataIn.guarantorRelationship && { guarantorRelationship: dataIn.guarantorRelationship.trim() }),
            ...(dataIn.guarantorIncome && { guarantorIncome: dataIn.guarantorIncome.trim() }),
            ...(dataIn.guarantorAid && { guarantorAid: dataIn.guarantorAid.trim() }),
        }

        // Remove viewed_at field from dataIn when user updates the deal
        // This ensures the deal is marked as unread again after user edits it
        const { viewed_at, ...dataInWithoutViewedAt } = sanitizedDataIn as any
        const finalDataIn = dataInWithoutViewedAt as LoanApplicationDataIn

        const simulatedDeal = {
            ...deal,
            dataIn: finalDataIn,
        } as LoanApplication

        const rejectionReason = await this.checkStopFactors(simulatedDeal)

        const currentDataOutRaw = deal.dataOut ?? {}
        const currentDataOut = typeof currentDataOutRaw === 'string'
            ? (() => {
                try {
                    return JSON.parse(currentDataOutRaw) as Record<string, unknown>
                } catch {
                    return {}
                }
            })()
            : (currentDataOutRaw as Record<string, unknown>)

        const nextDataOut: Record<string, unknown> = { ...currentDataOut }

        let nextStatusName: LoanApplication['statusName'] = 'SCORING'
        if (rejectionReason) {
            nextStatusName = 'REJECTED'
            nextDataOut.rejection_reason = rejectionReason
        } else {
            const score = await this.calculateScore(simulatedDeal)
            nextDataOut.scoring_result = {
                score,
                red_flags_checked: true,
            }
            delete nextDataOut.rejection_reason
        }

        return await this.updateLoanApplicationDeal(uuid, {
            ...(title ? { title } : {}),
            statusName: nextStatusName,
            dataIn: finalDataIn,
            dataOut: nextDataOut,
        })
    }

    /**
     * Одобрение заявки на кредит
     * Обновляет статус на APPROVED, сохраняет комментарий СБ и менеджера,
     * и автоматически генерирует график платежей (Finance)
     */
    public async approveLoanApplication(
        uuid: string,
        securityServiceComment: string,
        managerUuid: string
    ): Promise<{
        updatedDeal: LoanApplication
        journal: JournalLoanApplicationSnapshot
    }> {
        // Validate managerUuid
        if (typeof managerUuid !== 'string' || !managerUuid.trim()) {
            throw new Error(INTERNAL_DECISION_ERROR_MESSAGE);
        }

        const trimmedManagerUuid = managerUuid.trim();

        if (!this.isValidUuid(trimmedManagerUuid)) {
            throw new Error(INTERNAL_DECISION_ERROR_MESSAGE);
        }

        await this.ensureEmployeeExists(trimmedManagerUuid);

        // Get existing deal
        const deal = await this.findByUuid(uuid) as LoanApplication | undefined;
        if (!deal) {
            throw new Error(`Сделка не найдена.${ADMIN_CONTACT_MESSAGE}`);
        }

        // Validate that deal is a loan application
        const currentDataIn = this.normalizeLoanApplicationDataIn(deal.dataIn);
        if (currentDataIn.type !== 'LOAN_APPLICATION') {
            throw new Error(`Сделка не является заявкой на кредит.${ADMIN_CONTACT_MESSAGE}`);
        }

        // Prepare updated data
        const decision: LoanApplicationDecision = {
            securityServiceComment: securityServiceComment.trim(),
        };

        const updatedData: Partial<LoanApplication> = {
            statusName: 'APPROVED',
            dataIn: {
                ...currentDataIn,
                managerUuid: trimmedManagerUuid,
                decision,
            },
        };

        // Update deal
        const updatedDeal = await this.update(uuid, updatedData) as LoanApplication;

        // Create journal entry
        const journalsRepository = JournalsRepository.getInstance();
        const journal = await journalsRepository.createLoanApplicationSnapshot(
            updatedDeal as LoanApplication,
            deal,
            null
        );

        // Generate payment schedule
        const financesRepository = new FinancesRepository();
        const productPrice = Number(currentDataIn.productPrice) || 0;
        const downPayment = Number(currentDataIn.downPayment) || 0;
        const termMonths = currentDataIn.term && currentDataIn.term.length > 0
            ? currentDataIn.term[0]
            : 12;

        // Calculate first payment date (30 days from now)
        const firstPaymentDate = new Date();
        firstPaymentDate.setDate(firstPaymentDate.getDate() + 30);

        // Default payment limits configuration
        const defaultLimits: PaymentLimitsConfig = {
            minAmount: 0,
            maxAmount: productPrice,
            defaultTermMonths: termMonths,
            gracePeriodDays: 3,
            penaltyDailyRatePercent: 0.1,
            reminderEnabled: true,
            reminderDaysBefore: [7, 3, 1],
            reminderChannels: ['EMAIL', 'SMS'],
        };

        const scheduleInput: PaymentScheduleInput = {
            dealAid: updatedDeal.daid,
            totalAmount: productPrice,
            upfrontAmount: downPayment,
            termMonths: termMonths,
            firstPaymentDate: firstPaymentDate.toISOString().split('T')[0] as IsoDate,
            timezone: 'Europe/Moscow',
            paymentMethod: 'CARD',
            limits: defaultLimits,
            generatedBy: 'SYSTEM',
        };

        const scheduleResult = await financesRepository.generateScheduleForDeal(uuid, scheduleInput);

        // Save payment schedule to deal.dataIn for easy access
        const currentDataInAfterApproval = typeof updatedDeal.dataIn === 'string'
            ? (JSON.parse(updatedDeal.dataIn) as Record<string, unknown>)
            : (updatedDeal.dataIn as Record<string, unknown>) || {};
        
        const paymentSchedule = scheduleResult.items.map((item: FinanceDataIn, index: number) => ({
            number: index + 1,
            date: item.paymentDate,
            amount: item.totalAmount,
            status: 'Ожидается',
        }));

        const updatedDataInWithSchedule = {
            ...currentDataInAfterApproval,
            paymentSchedule,
        };

        // Update deal with payment schedule in dataIn
        await this.update(uuid, {
            dataIn: updatedDataInWithSchedule,
        });

        // Refresh updatedDeal to include payment schedule
        const dealWithSchedule = await this.findByUuid(uuid) as LoanApplication;

        // Send notification to client
        if (deal.clientAid) {
            try {
                const noticesRepository = NoticesRepository.getInstance();
                const clientName = currentDataIn.firstName && currentDataIn.lastName
                    ? `${currentDataIn.firstName} ${currentDataIn.lastName}`.trim()
                    : 'Уважаемый клиент';
                
                const emailSubject = 'Заявка одобрена';
                const emailBody = `
                    <h2>Поздравляем, ${clientName}!</h2>
                    <p>Ваша заявка на рассрочку №${deal.daid} была одобрена.</p>
                    <p>Сумма рассрочки: ${productPrice.toLocaleString('ru-RU')} ₽</p>
                    <p>Срок рассрочки: ${termMonths} ${termMonths === 1 ? 'месяц' : termMonths < 5 ? 'месяца' : 'месяцев'}</p>
                    <p>Наш менеджер свяжется с вами в ближайшее время для оформления документов.</p>
                `;

                const pushTitle = 'Заявка одобрена';
                const pushBody = `Ваша заявка №${deal.daid} была одобрена. Менеджер свяжется с вами в ближайшее время.`;

                // Send email and push notification
                await Promise.all([
                    noticesRepository.sendEmail(deal.clientAid, emailSubject, emailBody).catch(err => 
                        console.error('Failed to send approval email:', err)
                    ),
                    noticesRepository.sendPushNotification(deal.clientAid, pushTitle, pushBody).catch(err => 
                        console.error('Failed to send approval push:', err)
                    ),
                ]);
            } catch (error) {
                console.error('Failed to send approval notifications:', error);
                // Don't throw - notifications are not critical
            }
        }

        return {
            updatedDeal: dealWithSchedule,
            journal,
        };
    }

    /**
     * Отказ в заявке на кредит
     * Обновляет статус на CANCELLED и сохраняет комментарий СБ и менеджера
     */
    public async rejectLoanApplication(
        uuid: string,
        securityServiceComment: string,
        managerUuid: string
    ): Promise<{
        updatedDeal: LoanApplication
        journal: JournalLoanApplicationSnapshot
    }> {
        // Validate managerUuid
        if (typeof managerUuid !== 'string' || !managerUuid.trim()) {
            throw new Error(INTERNAL_DECISION_ERROR_MESSAGE);
        }

        const trimmedManagerUuid = managerUuid.trim();

        if (!this.isValidUuid(trimmedManagerUuid)) {
            throw new Error(INTERNAL_DECISION_ERROR_MESSAGE);
        }

        await this.ensureEmployeeExists(trimmedManagerUuid);

        // Get existing deal
        const deal = await this.findByUuid(uuid) as LoanApplication | undefined;
        if (!deal) {
            throw new Error(`Сделка не найдена.${ADMIN_CONTACT_MESSAGE}`);
        }

        // Validate that deal is a loan application
        const currentDataIn = this.normalizeLoanApplicationDataIn(deal.dataIn);
        if (currentDataIn.type !== 'LOAN_APPLICATION') {
            throw new Error(`Сделка не является заявкой на кредит.${ADMIN_CONTACT_MESSAGE}`);
        }

        // Prepare updated data
        const decision: LoanApplicationDecision = {
            securityServiceComment: securityServiceComment.trim(),
        };

        const updatedData: Partial<LoanApplication> = {
            statusName: 'CANCELLED',
            dataIn: {
                ...currentDataIn,
                managerUuid: trimmedManagerUuid,
                decision,
            },
        };

        // Update deal
        const updatedDeal = await this.update(uuid, updatedData) as LoanApplication;

        // Create journal entry
        const journalsRepository = JournalsRepository.getInstance();
        const journal = await journalsRepository.createLoanApplicationSnapshot(
            updatedDeal as LoanApplication,
            deal,
            null
        );

        // Send notification to client
        if (deal.clientAid) {
            try {
                const noticesRepository = NoticesRepository.getInstance();
                const clientName = currentDataIn.firstName && currentDataIn.lastName
                    ? `${currentDataIn.firstName} ${currentDataIn.lastName}`.trim()
                    : 'Уважаемый клиент';
                
                const emailSubject = 'Заявка отклонена';
                const emailBody = `
                    <h2>${clientName}, добрый день.</h2>
                    <p>К сожалению, ваша заявка на рассрочку №${deal.daid} была отклонена.</p>
                    ${securityServiceComment ? `<p>Причина: ${securityServiceComment}</p>` : ''}
                    <p>Если у вас есть вопросы, пожалуйста, свяжитесь с нашим отделом поддержки.</p>
                `;

                const pushTitle = 'Заявка отклонена';
                const pushBody = `Ваша заявка №${deal.daid} была отклонена. Проверьте email для подробностей.`;

                // Send email and push notification
                await Promise.all([
                    noticesRepository.sendEmail(deal.clientAid, emailSubject, emailBody).catch(err => 
                        console.error('Failed to send rejection email:', err)
                    ),
                    noticesRepository.sendPushNotification(deal.clientAid, pushTitle, pushBody).catch(err => 
                        console.error('Failed to send rejection push:', err)
                    ),
                ]);
            } catch (error) {
                console.error('Failed to send rejection notifications:', error);
                // Don't throw - notifications are not critical
            }
        }

        return {
            updatedDeal,
            journal,
        };
    }
    /**
     * получение deal с фильтрацией
     */
    public async getDeals({
        filters,
        orders,
        pagination,
    }: {
        filters?: DbFilters
        orders?: DbOrders
        pagination?: DbPagination
    } = {}): Promise<DbPaginatedResult<Deal>> {
        const filtersCondition = buildDbFilters(this.schema, filters);
        const whereCondition = withNotDeleted(this.schema.deletedAt, filtersCondition);

        const totalRows = await this.db
            .select({ count: sql<number>`count(*)`.mapWith(Number) })
            .from(this.schema)
            .where(whereCondition)
            .execute();

        const total = totalRows[0]?.count ?? 0;
        const limit = Math.max(1, Math.min(pagination?.limit ?? 20, 100));
        const page = Math.max(1, pagination?.page ?? 1);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const offset = (page - 1) * limit;


        const docs = await this.db
            .select()
            .from(this.schema)
            .where(whereCondition)
            .orderBy(...buildDbOrders(this.schema, orders))
            .limit(limit)
            .offset(offset)
            .execute();

        return {
            docs: docs as Deal[],
            pagination: {
                total,
                page,
                limit,
                totalPages,
            },
        };
    }

    /**
     * получение deals с полнотекстовым поиском по deals и связанным humans
     */
    public async getDealsWithSearch({
        searchQuery,
        filters,
        orders,
        pagination,
    }: {
        searchQuery: string
        filters?: DbFilters
        orders?: DbOrders
        pagination?: DbPagination
    }): Promise<DbPaginatedResult<Deal>> {
        const searchPattern = `%${searchQuery}%`
        
        // Build base filters condition
        const filtersCondition = buildDbFilters(this.schema, filters);
        const baseWhereCondition = withNotDeleted(this.schema.deletedAt, filtersCondition);

        // Build search conditions using ILIKE for case-insensitive search in PostgreSQL
        // drizzle-orm automatically escapes variables in sql template as parameters
        const searchConditions = or(
            sql`${this.schema.daid}::text ILIKE ${searchPattern}`,
            sql`${this.schema.title}::text ILIKE ${searchPattern}`,
            sql`${this.schema.dataIn}::text ILIKE ${searchPattern}`,
            sql`EXISTS (
                SELECT 1 FROM ${schema.humans} 
                WHERE ${schema.humans.haid} = ${this.schema.clientAid}
                AND ${schema.humans.deletedAt} IS NULL
                AND (
                    ${schema.humans.fullName}::text ILIKE ${searchPattern}
                    OR ${schema.humans.email}::text ILIKE ${searchPattern}
                )
            )`
        )

        // Combine base conditions with search
        const whereCondition = baseWhereCondition 
            ? and(baseWhereCondition, searchConditions)
            : searchConditions

        // Get total count
        const totalRows = await this.db
            .select({ count: sql<number>`count(DISTINCT ${this.schema.id})`.mapWith(Number) })
            .from(this.schema)
            .where(whereCondition)
            .execute();

        const total = totalRows[0]?.count ?? 0;
        const limit = Math.max(1, Math.min(pagination?.limit ?? 20, 100));
        const page = Math.max(1, pagination?.page ?? 1);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const offset = (page - 1) * limit;

        // Get deals with search
        const docs = await this.db
            .selectDistinct()
            .from(this.schema)
            .where(whereCondition)
            .orderBy(...buildDbOrders(this.schema, orders))
            .limit(limit)
            .offset(offset)
            .execute();

        return {
            docs: docs as Deal[],
            pagination: {
                total,
                page,
                limit,
                totalPages,
            },
        };
    }

    /**
     * Пометить заявку как просмотренную
     */
    public async markAsViewed(uuid: string, viewedAt: string | Date = new Date()): Promise<Deal> {
        const deal = await this.findByUuid(uuid) as Deal | null;
        if (!deal) {
            throw new Error(`Сделка не найдена.${ADMIN_CONTACT_MESSAGE}`);
        }

        const dataIn = this.normalizeLoanApplicationDataIn(deal.dataIn as any);
        const nextDataIn = {
            ...dataIn,
            viewed_at: viewedAt instanceof Date ? viewedAt.toISOString() : viewedAt,
        };

        const updatedDeal = await this.update(uuid, {
            dataIn: nextDataIn,
        });

        // Отправить сигнал админам об обновлении уведомлений
        await sendToRoom('admin', 'update-admin', {
            type: 'admin-updated-notices',
        }).catch((err) => {
            console.error('Failed to send admin-updated-notices socket event:', err);
        });

        return updatedDeal;
    }
    
  async confirm(params: { fullDaid?: string; daid?: string }): Promise<Deal | null> {
    const { fullDaid, daid } = params;

    const deal = fullDaid
      ? await this.findByFullDaid(fullDaid)
      : daid
      ? await this.findByDaid(daid)
      : undefined;

    if (!deal) {
      return null;
    }

    const nextStatus = 'IN_PROGRESS';
    const updatedAt = new Date();

    await this.db
      .update(schema.deals)
      .set({ statusName: nextStatus, updatedAt })
      .where(eq(schema.deals.id, deal.id));

    return {
      ...deal,
      statusName: nextStatus,
      updatedAt,
    };
  }

  async findByFullDaid(fullDaid: string): Promise<Deal | undefined> {
    const [deal] = await this.db
      .select()
      .from(schema.deals)
      .where(withNotDeleted(
        schema.deals.deletedAt,
        eq(schema.deals.fullDaid, fullDaid)
      ))
      .limit(1);

    return deal;
  }

  async findByDaid(daid: string): Promise<Deal | undefined> {
    const [deal] = await this.db
      .select()
      .from(schema.deals)
      .where(withNotDeleted(
        schema.deals.deletedAt,
        eq(schema.deals.daid, daid)
      ))
      .limit(1);

    return deal;
  }
}