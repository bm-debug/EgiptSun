import { BaseMove, Contractor, Product, Relation, Wallet, WalletTransaction, Human } from "../schema/types";

export interface Receiving extends Omit<BaseMove, 'dataIn'>    {
    laid_from: null;
    laid_to: string;
    data_in: ReceivingDataIn | null;

}
export interface ReceivingDataIn {
    sending_baid?: string | null;
    type?: 'RECEIVING';
    inventory_list?: InventoryItem[];
    /** стоимость закупки всего товара в машине в копейках */
    purchase_price_transport?: number;
    transportCost?: number;
    title?: string;
    date?: string;
    owner_eaid?: string;
    location_laid?: string;
    /** Количество различных Products в приходе */
    SKU_count?: number;
    /** Количество позиций в приходе */
    items_count?: number;
    [key: string]: any;
}

export interface Sending extends Omit<BaseMove, 'dataIn'> {
    laid_from: string;
    laid_to: null;
    dataIn: SendingDataIn | null;
}

export interface SendingDataIn {
    type?: 'SENDING';
    inventory_list?: InventoryItem[];
    title?: string;
    date?: string;
    owner_eaid?: string;
    location_laid?: string;
    contractor_caid?: string;
    /** стоимость транспортировки в копейках */
    transport_price?: number;
    /**
     * общая цена машины в копейках без цены транспортировки
     * высчитывается как сумма стоимости всего товара
     * стоимсоть отдельного товара берется из ProductExtendedDataIn.average_purchase_price
     * стоимость отдельной позиции получается умножением ProductExtendedDataIn.average_purchase_price 
     * на RelationInventoryDataIn.quantity или RelationInventoryDataIn.temp_quantity
     */
    total_selling_price_net?: number;
    /**
     * общая цена машины в копейках с ценой транспортировки
     * высчитывается как сумма стоимости транспортировки и стоимости всего товара
     * SendingDataIn.transport_price + SendingDataIn.total_selling_price_net
     */
    total_selling_price?: number;
    /**
     * закупочная цена всех товаров в машине в копейках
     * сумма всех закупочных цен товаров в машине
     * для каждого товара берется из ProductExtendedDataIn.average_purchase_price_net * RelationInventoryDataIn.quantity или RelationInventoryDataIn.temp_quantity
     */
    total_purchase_price?: number;
    /**
     * выгода в копейках разность между SendingDataIn.total_selling_price и SendingDataIn.total_purchase_price
     */
    margin_amount?: number;
    /**
     * выгода в % 
     * SendingDataIn.margin_amount / SendingDataIn.total_purchase_price * 100
     */
    margin_to_purchase_price?: number;
    /**
     * выгода в % 
     * SendingDataIn.margin_amount / SendingDataIn.total_selling_price * 100
     */
    margin_to_selling_price?: number;

    [key: string]: any;
}

export interface InventoryItem {
    uuid?: string;
    quantity?: number;
    hiddenQuantity?: number;
    status?: string;
    variantFullPaid?: string;
    productVariantFullPaid?: string;
    data?: {
        purchase_price?: number;
        purchase_price_net?: number;
        [key: string]: unknown;
    } & Record<string, unknown>;
    [key: string]: unknown;
}

export interface ProductExtended extends Product {
    data_in: ProductExtendedDataIn
}
export interface ProductExtendedDataIn {
    markup_amount?: number;
    markup_measurement?: string;
    /** 
     * начальная себестоицена мость товара в копейках 
     */
    price?: number;
    /** 
     * средняя себестоимость товара в копейках 
     * пока нет связанных RelationInventory
     * берется из ProductExtendedDataIn.price
     * когда у Receiving statusName изменится на COMPLETED, то average_purchase_price пересчитывается
     * 1. полный список связанных RelationInventory и ProductExtendedDataIn для каждого
     * 2. из ProductExtendedDataIn получаем average_purchase_price или price если нет и умножаем  на RelationInventoryDataIn.quantity 
     * или RelationInventoryDataIn.temp_quantity и получем "взвешенный объем товара" который сумируем и получаем общий "объем всех товаров" в машине
     * 3. вячисляем какую долю "взвешенный объем товара" от общего "объема всех товаров" для каждого товара 
     * и умножаем на ReceivingDataIn.purchase_price_transport
     * 
     *  
     */
    average_purchase_price_net?: number;
    /** 
     * средняя себестоимость товара в копейках с наценкой
     * 
     * если markup_measurement = '%', то average_purchase_price = average_purchase_price_net * (1 + markup_amount / 100)
     * если markup_measurement = 'FIX', то average_purchase_price = average_purchase_price_net + (markup_amount * 100)
     */
    average_purchase_price?: number;
}

export interface RelationInventory extends Relation {
    /** связь на Product */
    source_entity: Product['paid'];
    product?: ProductExtended;
    data_in: RelationInventoryDataIn
}
export interface RelationInventoryDataIn {
     /** Себестоимость товара в копейках высчитывается из стоимости машины 
      * высчитывается как сумма purchase_price_net и transportCost
     */
    purchase_price?: number;
    /**
     * @deprecated use purchase_price instead
     *  Себестоимость товара в копейках без учета затрат на транспортировку
     * */
    purchase_price_net?: number;
    /** временное Количество товара в приходе переходит в quantity после смены у связанного baseMove statusName на COMPLETED*/

    temp_quantity?: number;
    /** подтвержденное Количество товара */
    quantity?: number;
    /** цена товара в копейках */
    selling_price?: number;
}

export interface RelationInventorySending extends RelationInventory {
    /** связь на Product */
    source_entity: Product['paid'];
    data_in: RelationInventorySendingDataIn
}
export interface RelationInventorySendingDataIn extends RelationInventoryDataIn {
}

export interface ContractorExtended extends Contractor {
}


export interface WalletExtended extends Omit<Wallet, 'data_in'> {
    /**
     *  связь на Contractor 
     * */
    target_aid: ContractorExtended['caid'];
    data_in: WalletDataIn
}
export interface WalletDataIn {
    type?: 'contractor_wallet';
}

export interface WalletTransactionExtended extends WalletTransaction {
    /**
     * сумма транзакции в копейках
     * */
    amount: string;
}


export interface HumanExtended extends Human {
    data_in: HumanDataIn
}
export interface HumanDataIn {
    
}