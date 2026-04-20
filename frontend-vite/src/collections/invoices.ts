import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const invoiceSchema = z.object({
  id: z.string().optional(),
  booker: z.string().optional(),
  completed: z.number().optional(),
  created: z.date().optional(),
  dated: z.string().optional(),
  deleted: z.number().optional(),
  description: z.string().optional(),
  discount_1: z.number().optional(),
  discount_2: z.number().optional(),
  discount_rs: z.number().optional(),
  duedate: z.string().optional(),
  invoiceNo: z.number().optional(),
  invoice_maker: z.string().optional(),
  party: z.string().optional(),
  type: z.string().optional(),
  updated: z.date().optional(),
})

type SelectInvoice = {
  id: string
  booker?: string
  completed?: number
  created?: number
  dated?: string
  deleted?: number
  description?: string
  discount_1?: number
  discount_2?: number
  discount_rs?: number
  duedate?: string
  invoiceNo?: number
  invoice_maker?: string
  party?: string
  type?: string
  updated?: number
}

type Invoice = z.infer<typeof invoiceSchema> & { id: string; created?: Date; updated?: Date }

// Create collection
export const invoicesCollection = createCollection<SelectInvoice, Invoice>(
  trailBaseCollectionOptions({
    id: 'invoices',
    recordApi: trailBaseClient.records('invoices'),
    getKey: (item) => item.id,
    schema: invoiceSchema,
    parse: {
      created: (ts) => ts ? new Date(ts * 1000) : undefined,
      updated: (ts) => ts ? new Date(ts * 1000) : undefined,
    },
    serialize: {
      created: (date) => date ? Math.floor(date.valueOf() / 1000) : undefined,
      updated: (date) => date ? Math.floor(date.valueOf() / 1000) : undefined,
    },
    onInsert: async ({ transaction }) => {
      const newInvoice = transaction.mutations[0].modified
      console.log('Invoice created:', newInvoice)
    },
  })
)

// CRUD utility functions
export const createInvoice = async (data: Partial<Invoice>) => {
  await invoicesCollection.insert({
    id: uuidv7(),
    ...data,
  });
};

export const updateInvoice = async (id: string, data: Partial<Invoice>) => {
  await invoicesCollection.update(id, {
    ...data,
    updated: new Date(),
  });
};

export const deleteInvoice = async (id: string) => {
  await invoicesCollection.delete(id);
};