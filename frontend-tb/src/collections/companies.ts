import { trailbaseClient } from "../trailbaseClient";
import { createCollection } from "@tanstack/react-db";
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'

export type Company = {
  id: string;
  name: string;
  created: Date;
  updated: Date;
}

type SelectCompany = {
  id: string;
  name: string;
  created: number;
  updated: number;
}

export const companiesCollection = createCollection<Company>(
  trailBaseCollectionOptions({
    //required options
    id: "companies",
    recordApi: trailbaseClient.records('companies'),
    getKey: (company) => company.id as string,
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
      const newCompany = transaction.mutations[0].modified
      console.log('Company created:', newCompany)
    },
    onUpdate: () => { console.log("updated") },
    onDelete: () => { },
  })
)