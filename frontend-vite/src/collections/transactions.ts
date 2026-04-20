import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const transactionSchema = z.object({
  id: z.string().optional(),
  cost_price: z.number().optional(),
  created: z.date().optional(),
  deleted: z.number().optional(),
  discount_1: z.number().optional(),
  discount_2: z.number().optional(),
  discount_rs: z.number().optional(),
  invoice: z.string().optional(),
  item: z.string().optional(),
  price: z.number().optional(),
  qty: z.number().optional(),
  scheme: z.number().optional(),
  updated: z.date().optional(),
})

type SelectTransaction = {
  id: string
  cost_price?: number
  created?: number
  deleted?: number
  discount_1?: number
  discount_2?: number
  discount_rs?: number
  invoice?: string
  item?: string
  price?: number
  qty?: number
  scheme?: number
  updated?: number
}

type Transaction = z.infer<typeof transactionSchema> & { id: string; created?: Date; updated?: Date }

// Create collection
export const transactionsCollection = createCollection<SelectTransaction, Transaction>(
  trailBaseCollectionOptions({
    id: 'transactions',
    recordApi: trailBaseClient.records('transactions'),
    getKey: (item) => item.id,
    schema: transactionSchema,
    parse: {
      created: (ts) => ts ? new Date(ts * 1000) : undefined,
      updated: (ts) => ts ? new Date(ts * 1000) : undefined,
    },
    serialize: {
      created: (date) => date ? Math.floor(date.valueOf() / 1000) : undefined,
      updated: (date) => date ? Math.floor(date.valueOf() / 1000) : undefined,
    },
    onInsert: async ({ transaction }) => {
      const newTransaction = transaction.mutations[0].modified
      console.log('Transaction created:', newTransaction)
    },
  })
)

// CRUD utility functions
export const createTransaction = async (data: Partial<Transaction>) => {
  await transactionsCollection.insert({
    id: uuidv7(),
    ...data,
  });
};

export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
  await transactionsCollection.update(id, {
    ...data,
    updated: new Date(),
  });
};

export const deleteTransaction = async (id: string) => {
  await transactionsCollection.delete(id);
};