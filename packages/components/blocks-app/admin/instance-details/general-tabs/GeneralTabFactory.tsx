import React from "react";
import { Contractors } from "./Contractors";
import { Games } from "./Games";
import { Contractor, Product } from "@/shared/schema";

export function GeneralTabFactory({collectionName,instance}:{collectionName : string, instance: Contractor | Product}) {
    switch (collectionName) {
        case 'contractors': 
            return <Contractors  contractor={instance as Contractor} />
        case 'products': 
            return <Games  game={instance as Product} />
        default:
            return null
    }
}