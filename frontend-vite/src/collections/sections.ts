import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const sectionSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  created: z.date().optional(),
  updated: z.date().optional(),
})

type SelectSection = {
  id: string
  name: string
  created: number
  updated: number
}

type Section = z.infer<typeof sectionSchema> & { id: string; created: Date; updated: Date }

// Create collection
export const sectionsCollection = createCollection<SelectSection, Section>(
  trailBaseCollectionOptions({
    id: 'sections',
    recordApi: trailBaseClient.records('sections'),
    getKey: (item) => item.id,
    schema: sectionSchema,
    parse: {
      created: (ts) => new Date(ts * 1000),
      updated: (ts) => new Date(ts * 1000),
    },
    serialize: {
      created: (date) => Math.floor(date.valueOf() / 1000),
      updated: (date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newSection = transaction.mutations[0].modified
      console.log('Section created:', newSection)
    },
  })
)

// CRUD utility functions
export const createSection = async (name: string) => {
  if (!name.trim()) return;
  await sectionsCollection.insert({
    id: uuidv7(),
    name: name.trim(),
  });
};

export const updateSection = async (id: string, name: string) => {
  if (!name.trim()) return;
  await sectionsCollection.update(id, {
    name: name.trim(),
    updated: new Date(),
  });
};

export const deleteSection = async (id: string) => {
  await sectionsCollection.delete(id);
};