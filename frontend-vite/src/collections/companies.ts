import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const companySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  created: z.date().optional(),
  updated: z.date().optional(),
})

type SelectCompany = {
  id: string
  name: string
  created: number
  updated: number
}

type Company = z.infer<typeof companySchema> & { id: string; created: Date; updated: Date }

// Create collection
export const companiesCollection = createCollection<SelectCompany, Company>(
  trailBaseCollectionOptions({
    id: 'companies',
    recordApi: trailBaseClient.records('companies'),
    getKey: (item) => item.id,
    schema: companySchema,
    parse: {
      created: (ts) => new Date(ts * 1000),
      updated: (ts) => new Date(ts * 1000),
    },
    serialize: {
      created: (date) => Math.floor(date.valueOf() / 1000),
      updated: (date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newCompany = transaction.mutations[0].modified
      console.log('Company created:', newCompany)
    },
  })
)

// CRUD utility functions
export const createCompany = async (name: string) => {
  if (!name.trim()) return;
  await companiesCollection.insert({
    id: uuidv7(),
    name: name.trim(),
  });
};

export const updateCompany = async (id: string, name: string) => {
  if (!name.trim()) return;
  await companiesCollection.update(id, {
    name: name.trim(),
    updated: new Date(),
  });
};

export const deleteCompany = async (id: string) => {
  await companiesCollection.delete(id);
};