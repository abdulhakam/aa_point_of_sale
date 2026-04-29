import { trailbaseClient } from "../trailbaseClient";
import { createCollection } from "@tanstack/react-db";
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'


export const sectionsCollection = createCollection(
  trailBaseCollectionOptions({
    //required options
    id: "sections",
    recordApi: trailbaseClient.records('sections'),
    getKey: (section) => section.id as string,
    // optionals
    // schema: Standard Schema compatible schema (e.g., Zod, Effect) for client-side validation
    parse: {
      created: (ts: number) => new Date(ts * 1000),
      updated: (ts: number) => new Date(ts * 1000),
    },
    serialize: {
      created: (date: Date) => Math.floor(date.valueOf() / 1000),
      updated: (date: Date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newSection = transaction.mutations[0].modified
      console.log('Section created:', newSection)
    },
    onUpdate: () => { console.log("updated") },
    onDelete: () => { },
  })
)