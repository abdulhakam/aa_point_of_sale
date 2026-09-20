import { trailbaseClient } from "../trailbaseClient";
import { createCollection } from "@tanstack/react-db";
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'

export type Product = {
  id: string;
  category: string;
  company: string;
  cost_price: number;
  name: string;
  sale_price: number;
  box_size_qty: number;
  created: Date;
  updated: Date;
}

type SelectProduct = {
  id: string;
  category: string;
  company: string;
  cost_price: number;
  name: string;
  sale_price: number;
  box_size_qty: number;
  created: number;
  updated: number;
}

export const productsCollection = createCollection<Product>(
  trailBaseCollectionOptions({
    id: "products",
    recordApi: trailbaseClient.records('products'),
    getKey: (record) => record.id,
    parse: {
      created: (ts: number) => new Date(ts * 1000),
      updated: (ts: number) => new Date(ts * 1000),
    },
    serialize: {
      created: (date: Date) => Math.floor(date.valueOf() / 1000),
      updated: (date: Date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: () => { console.log("product inserted") },
    onUpdate: () => { console.log("updated") },
    onDelete: () => { },
  })
)