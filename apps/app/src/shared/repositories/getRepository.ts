import { i18n } from "../services/i18n"
import { BasesRepository } from "./bases.repository"
import { BaseMovesRepository } from "./base-moves.repository"
import { ContractorsRepository } from "./contractors.repository"
import { DealProductsRepository } from "./deal-products.repository"
import { DealsRepository } from "./deals.repository"
import { FilesRepository } from "./files.repository"
import { FinancesRepository } from "./finances.repository"
import { GoalsRepository } from "./goals.repository"
import { HumanRepository } from "./human.repository"
import { JournalsRepository } from "./journals.repository"
import { LocationsRepository } from "./locations.repository"
import { MediaRepository } from "./media.repository"
import { MessageThreadsRepository } from "./message-threads.repository"
import { MessagesRepository } from "./messages.repository"
import { NewsRepository } from "./news.repository"
import { NoticesRepository } from "./notices.repository"
import { ProductVariantsRepository } from "./product-variants.repository"
import { ProductsRepository } from "./products.repository"
import { RelationsRepository } from "./relations.repository"
import { RolesRepository } from "./roles.repository"
import { SettingsRepository } from "./settings.repository"
import { TaxonomyRepository } from "./taxonomy.repository"
import { TextsRepository } from "./texts.repository"
import { UserRolesRepository } from "./user-roles.repository"
import { UserSessionsRepository } from "./user-sessions.repository"
import { UsersRepository } from "./users.repository"
import { WalletRepository } from "./wallet.repository"
import { WalletTransactionRepository } from "./wallet-transaction.repository"
import { WalletTransactionsRepository } from "./wallet-transactions.repository"
import { WalletsRepository } from "./wallets.repository"
import BaseRepository from "./BaseRepositroy"

export function getRepository(collectionName: string, locale?:string): BaseRepository<any>{
    switch(collectionName){
        case 'bases':
            return BasesRepository.getInstance()
        case 'base_moves':
            return BaseMovesRepository.getInstance()
        case 'contractors':
            return ContractorsRepository.getInstance()
        case 'deal_products':
            return DealProductsRepository.getInstance()
        case 'deals':
            return DealsRepository.getInstance()
        case 'files':
            return FilesRepository.getInstance()
        case 'finances':
            return FinancesRepository.getInstance()
        case 'goals':
            return GoalsRepository.getInstance()
        case 'humans':
            return HumanRepository.getInstance()
        case 'journals':
            return JournalsRepository.getInstance()
        case 'locations':
            return LocationsRepository.getInstance()
        case 'media':
            return MediaRepository.getInstance()
        case 'message_threads':
            return MessageThreadsRepository.getInstance()
        case 'messages':
            return MessagesRepository.getInstance()
        case 'news':
            return NewsRepository.getInstance()
        case 'notices':
            return NoticesRepository.getInstance()
        case 'product_variants':
            return ProductVariantsRepository.getInstance()
        case 'products':
            return ProductsRepository.getInstance()
        case 'relations':
            return RelationsRepository.getInstance()
        case 'roles':
            return RolesRepository.getInstance()
        case 'settings':
            return SettingsRepository.getInstance()
        case 'taxonomy':
            return TaxonomyRepository.getInstance()
        case 'texts':
            return TextsRepository.getInstance()
        case 'user_roles':
            return UserRolesRepository.getInstance()
        case 'user_sessions':
            return UserSessionsRepository.getInstance()
        case 'users':
            return UsersRepository.getInstance()
        case 'wallet':
            return WalletRepository.getInstance()
        case 'wallet_transaction':
            return WalletTransactionRepository.getInstance()
        case 'wallet_transactions':
            return WalletTransactionsRepository.getInstance()
        case 'wallets':
            return WalletsRepository.getInstance()
        default:
            throw new Error(i18n.tSync('collection.not_found', locale))
    }
}
