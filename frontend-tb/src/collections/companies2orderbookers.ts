import { trailbaseClient } from "../trailbaseClient";
import { createCollection } from "@tanstack/react-db";
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'

export type Companies2OrderBookers = {
  id: string;
  order_booker: string;
  company: string;
}

export const companies2orderBookersCollection = createCollection<Companies2OrderBookers>(
  trailBaseCollectionOptions({
    id: "companies2orderbookers",
    recordApi: trailbaseClient.records('companies2orderbookers'),
    getKey: (record) => record.id,
    onInsert: () => { console.log("companies2orderbookers inserted") },
    onUpdate: () => { console.log("updated") },
    onDelete: () => { },
  })
)