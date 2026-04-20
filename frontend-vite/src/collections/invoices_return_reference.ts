import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const invoiceReturnReferenceSchema = z.object({
  id: z.string().optional(),
  created: z.date().optional(),
  original_invoices: z.string().optional(),
  updated: z.date().optional(),
})

type SelectInvoiceReturnReference = {
  id: string
  created?: number
  original_invoices?: string
  updated?: number
}

type InvoiceReturnReference = z.infer<typeof invoiceReturnReferenceSchema> & { id: string; created?: Date; updated?: Date }

// Create collection
export const invoicesReturnReferenceCollection = createCollection<SelectInvoiceReturnReference, InvoiceReturnReference>(
  trailBaseCollectionOptions({
    id: 'invoices_return_reference',
    recordApi: trailBaseClient.records('invoices_return_reference'),
    getKey: (item) => item.id,
    schema: invoiceReturnReferenceSchema,
    parse: {
      created: (ts) => ts ? new Date(ts * 1000) : undefined,
      updated: (ts) => ts ? new Date(ts * 1000) : undefined,
    },
    serialize: {
      created: (date) => date ? Math.floor(date.valueOf() / 1000) : undefined,
      updated: (date) => date ? Math.floor(date.valueOf() / 1000) : undefined,
    },
    onInsert: async ({ transaction }) => {
      const newRef = transaction.mutations[0].modified
      console.log('Invoice return reference created:', newRef)
    },
  })
)

// CRUD utility functions
export const createInvoiceReturnReference = async (data: Partial<InvoiceReturnReference>) => {
  await invoicesReturnReferenceCollection.insert({
    id: uuidv7(),
    ...data,
  });
};

export const updateInvoiceReturnReference = async (id: string, data: Partial<InvoiceReturnReference>) => {
  await invoicesReturnReferenceCollection.update(id, {
    ...data,
    updated: new Date(),
  });
};

export const deleteInvoiceReturnReference = async (id: string) => {
  await invoicesReturnReferenceCollection.delete(id);
};