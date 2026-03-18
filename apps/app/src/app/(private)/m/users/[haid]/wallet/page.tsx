import UserWalletPageComponent from '@/components/blocks-app/wallets/UserWalletPage'
import { WalletRepository } from '@/shared/repositories/wallet.repository'
import { notFound } from 'next/navigation'
import { altrpWallet, WalletType } from '@/shared/types/altrp-finance'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { MeRepository } from '@/shared/repositories/me.repository'
import { TaxonomyRepository } from '@/shared/repositories/taxonomy.repository'


export default async function UserWalletPage({
    params,
    searchParams
}: {
    params: Promise<{ haid: string }>
    searchParams: Promise<{ type?: string }>
}) {
    const { haid } = await params
    const { type } = await searchParams

    const humanRepo = HumanRepository.getInstance()
    const human = await humanRepo.findByHaid(haid)
    const meRepository = MeRepository.getInstance()
    const user = await meRepository.findByEmailWithRoles(human.email)

    if (!user) {
        return notFound()
    }

    // Get available wallet types for this user based on their roles
    const availableTypes: WalletType[] = []
    if (user.roles.some(role => role.name === 'client')) {
        availableTypes.push('CLIENT' as WalletType)
    }
    if (user.roles.some(role => role.name === 'investor')) {
        availableTypes.push('INVESTOR' as WalletType)
    }

    // Determine wallet type: use type from URL if valid, otherwise default to first available
    let walletType: WalletType
    if (type && availableTypes.includes(type as WalletType)) {
        walletType = type as WalletType
    } else if (availableTypes.length > 0) {
        walletType = availableTypes[0]
    } else {
        return notFound()
    }

    const walletRepository = WalletRepository.getInstance()
    const wallet = await walletRepository.getWalletByHumanHaid(haid, walletType)
    if (!wallet) {
        return notFound()
    }
    const taxRepository = TaxonomyRepository.getInstance()
    const taxOptions = await taxRepository.getTaxonomies({
        filters: {
            conditions: [{
                field: 'entity',
                operator: 'eq',
                values: ['wallet.dataIn.type']
            }]
        }
    })



    return <UserWalletPageComponent
        wallet={wallet as altrpWallet}
        userUuid={user.uuid}
        walletType={walletType}
        walletTypeOptions={taxOptions.docs.filter(tax => user.roles.some(role => tax.name.toLowerCase() === role.name?.toLowerCase()))} />
}