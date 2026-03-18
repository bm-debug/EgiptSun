import BaseCollection from "./BaseCollection";
import Users from "./users";
import UserRoles from "./user_roles";
import Humans from "./humans";
import Roles from "./roles";
import Contractors from "./contractors";
import { products } from "../schema";
import Products from "./products";
import Goals from "./goals";
import Texts from "./texts";
import Media from "./media";

const collections: Record<string, BaseCollection> = {
    base: new BaseCollection('base'),
    users: new Users(),
    user_roles: new UserRoles(),
    humans: new Humans(),
    products: new Products(),
    roles: new Roles() as unknown as BaseCollection, // Roles overrides name as BaseColumn, but collection name is still accessible via constructor
    contractors: new Contractors() as unknown as BaseCollection,
    goals: new Goals(),
    texts: new Texts(),
    media: new Media(),
}


export const getCollection = (collection: string, role: string = 'Administrator'): BaseCollection => {
    switch (role) {
        case 'Administrator':
            return collections[collection] || collections.base;
        case 'Editor':
        case 'editor':
            return collections[collection] || collections.base;
        default:
            return collections[collection] || collections.base;
    }
}
