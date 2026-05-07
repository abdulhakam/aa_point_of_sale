import { trailbaseClient } from "../trailbaseClient";
import { createCollection } from "@tanstack/react-db";
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'

export type Category = {
  id: string;
  name: string;
  created: Date;
  updated: Date;
}

type SelectCategory = {
  id: string;
  name: string;
  created: number;
  updated: number;
}

export const categoriesCollection = createCollection<Category>(
  trailBaseCollectionOptions({
    id: "categories",
    recordApi: trailbaseClient.records('categories'),
    getKey: (record) => record.id,
    parse: {
      created: (ts: number) => new Date(ts * 1000),
      updated: (ts: number) => new Date(ts * 1000),
    },
    serialize: {
      created: (date: Date) => Math.floor(date.valueOf() / 1000),
      updated: (date: Date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: () => { console.log("category inserted") },
    onUpdate: () => { console.log("updated") },
    onDelete: () => { },
  })
)