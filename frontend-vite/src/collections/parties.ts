import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const partySchema = z.object({
  id: z.string().optional(),
  address: z.string(),
  area: z.string(),
  name: z.string(),
  phone: z.string(),
  type: z.string(),
  company: z.string(),
  created: z.date().optional(),
  updated: z.date().optional(),
})

type SelectParty = {
  id: string
  address: string
  area: string
  name: string
  phone: string
  type: string
  company: string
  created: number
  updated: number
}

type Party = z.infer<typeof partySchema> & { id: string; created: Date; updated: Date }

// Create collection
export const partiesCollection = createCollection<SelectParty, Party>(
  trailBaseCollectionOptions({
    id: 'parties',
    recordApi: trailBaseClient.records('parties'),
    getKey: (item) => item.id,
    schema: partySchema,
    parse: {
      created: (ts) => new Date(ts * 1000),
      updated: (ts) => new Date(ts * 1000),
    },
    serialize: {
      created: (date) => Math.floor(date.valueOf() / 1000),
      updated: (date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newParty = transaction.mutations[0].modified
      console.log('Party created:', newParty)
    },
  })
)

// CRUD utility functions
export const createParty = async (name: string, phone: string, address: string, area: string, type: string, company: string) => {
  if (!name.trim() || !phone.trim() || !address.trim() || !area || !type.trim() || !company.trim()) return;
  await partiesCollection.insert({
    id: uuidv7(),
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    area,
    type: type.trim(),
    company: company.trim(),
  });
};

export const updateParty = async (id: string, name: string, phone: string, address: string, area: string, type: string, company: string) => {
  if (!name.trim() || !phone.trim() || !address.trim() || !area || !type.trim() || !company.trim()) return;
  await partiesCollection.update(id, {
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    area,
    type: type.trim(),
    company: company.trim(),
    updated: new Date(),
  });
};

export const deleteParty = async (id: string) => {
  await partiesCollection.delete(id);
};