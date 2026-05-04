import { trailbaseClient } from "../trailbaseClient";
import { createCollection } from "@tanstack/react-db";
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'

export type PartiesEnumType = {
  id: number;
  name: string;
}

export const partiesEnumTypeCollection = createCollection<PartiesEnumType>(
  trailBaseCollectionOptions({
    id: "parties_enum_type",
    recordApi: trailbaseClient.records('parties_enum_type'),
    getKey: (record) => record.id.toString(),
    parse: {
      id: (id: string) => parseInt(id),
    },
    serialize: {
      id: (id: number) => id.toString(),
    },
    onInsert: () => { console.log("parties_enum_type inserted") },
    onUpdate: () => { console.log("updated") },
    onDelete: () => { },
  })
)