import { trailbaseClient } from "../trailbaseClient";
import { createCollection } from "@tanstack/react-db";
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'

export type Party = {
  id: string;
  name: string;
  address: string;
  phone: string;
  area: string; // or object if expanded
  type: number; // or object if expanded
  created: Date;
  updated: Date;
}

type SelectParty = {
  id: string;
  name: string;
  address: string;
  phone: string;
  area: string | any; // depending on expand
  type: number | any;
  created: number;
  updated: number;
}

export const partiesCollection = createCollection<Party>(
  trailBaseCollectionOptions({
    //required options
    id: "parties",
    recordApi: trailbaseClient.records('parties'),
    getKey: (party) => party.id as string,
    // optionals
    parse: {
      created: (ts: number) => new Date(ts * 1000),
      updated: (ts: number) => new Date(ts * 1000),
    },
    serialize: {
      created: (date: Date) => Math.floor(date.valueOf() / 1000),
      updated: (date: Date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newParty = transaction.mutations[0].modified
      console.log('Party created:', newParty)
    },
    onUpdate: () => { console.log("updated") },
    onDelete: () => { },
  })
)