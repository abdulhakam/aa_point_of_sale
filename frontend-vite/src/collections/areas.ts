import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const areaSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  section: z.string(),
  created: z.date().optional(),
  updated: z.date().optional(),
})

type SelectArea = {
  id: string
  name: string
  section_id: string
  created: number
  updated: number
}

type Area = z.infer<typeof areaSchema> & { id: string; created: Date; updated: Date }

// Create collection
export const areasCollection = createCollection<SelectArea, Area>(
  trailBaseCollectionOptions({
    id: 'areas',
    recordApi: trailBaseClient.records('areas'),
    getKey: (item) => item.id,
    schema: areaSchema,
    parse: {
      created: (ts) => new Date(ts * 1000),
      updated: (ts) => new Date(ts * 1000),
    },
    serialize: {
      created: (date) => Math.floor(date.valueOf() / 1000),
      updated: (date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newArea = transaction.mutations[0].modified
      console.log('Area created:', newArea)
    },
  })
)

// CRUD utility functions
export const createArea = async (name: string, section: string) => {
  if (!name.trim() || !section) return;
  await areasCollection.insert({
    id: uuidv7(),
    name: name.trim(),
    section,
  });
};

export const updateArea = async (id: string, name: string, section: string) => {
  if (!name.trim() || !section) return;
  await areasCollection.update(id, {
    name: name.trim(),
    section,
    updated: new Date(),
  });
};

export const deleteArea = async (id: string) => {
  await areasCollection.delete(id);
};