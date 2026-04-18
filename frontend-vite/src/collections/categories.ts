import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  created: z.date().optional(),
  updated: z.date().optional(),
})

type SelectCategory = {
  id: string
  name: string
  created: number
  updated: number
}

type Category = z.infer<typeof categorySchema> & { id: string; created: Date; updated: Date }

// Create collection
export const categoriesCollection = createCollection<SelectCategory, Category>(
  trailBaseCollectionOptions({
    id: 'categories',
    recordApi: trailBaseClient.records('categories'),
    getKey: (item) => item.id,
    schema: categorySchema,
    parse: {
      created: (ts) => new Date(ts * 1000),
      updated: (ts) => new Date(ts * 1000),
    },
    serialize: {
      created: (date) => Math.floor(date.valueOf() / 1000),
      updated: (date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newCategory = transaction.mutations[0].modified
      console.log('Category created:', newCategory)
    },
  })
)

// CRUD utility functions
export const createCategory = async (name: string) => {
  if (!name.trim()) return;
  await categoriesCollection.insert({
    id: uuidv7(),
    name: name.trim(),
  });
};

export const updateCategory = async (id: string, name: string) => {
  if (!name.trim()) return;
  await categoriesCollection.update(id, {
    name: name.trim(),
    updated: new Date(),
  });
};

export const deleteCategory = async (id: string) => {
  await categoriesCollection.delete(id);
};