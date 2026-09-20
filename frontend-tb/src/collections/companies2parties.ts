import { trailbaseClient } from "../trailbaseClient";
import { createCollection } from "@tanstack/react-db";
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'

export type Companies2Parties = {
  id: string;
  company: string;
  party: string;
}

export const companies2partiesCollection = createCollection<Companies2Parties>(
  trailBaseCollectionOptions({
    id: "companies2parties",
    recordApi: trailbaseClient.records('companies2parties'),
    getKey: (record) => record.id.toString(),
    parse: {
      id: (val: number) => val,
    },
    onInsert: () => { console.log("companies2parties inserted") },
    onUpdate: () => { console.log("updated") },
    onDelete: () => { },
  })
)