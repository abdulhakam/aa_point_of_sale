import { trailbaseClient } from "../trailbaseClient";
import { createCollection } from "@tanstack/react-db";
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'

export type OrderBooker = {
  id: string;
  name: string;
  phone: string;
  created: Date;
  updated: Date;
}

type SelectOrderBooker = {
  id: string;
  name: string;
  phone: string;
  created: number;
  updated: number;
}

export const orderBookersCollection = createCollection<OrderBooker>(
  trailBaseCollectionOptions({
    id: "order_bookers",
    recordApi: trailbaseClient.records('order_bookers'),
    getKey: (record) => record.id,
    parse: {
      created: (ts: number) => new Date(ts * 1000),
      updated: (ts: number) => new Date(ts * 1000),
    },
    serialize: {
      created: (date: Date) => Math.floor(date.valueOf() / 1000),
      updated: (date: Date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: () => { console.log("order booker inserted") },
    onUpdate: () => { console.log("updated") },
    onDelete: () => { },
  })
)