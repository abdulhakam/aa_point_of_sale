import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const expenseSchema = z.object({
  id: z.string().optional(),
  amount: z.number(),
  description: z.string(),
  name: z.string(),
  date: z.string(),
  created: z.date().optional(),
  updated: z.date().optional(),
})

type SelectExpense = {
  id: string
  amount: number
  description: string
  name: string
  date: string
  created: number
  updated: number
}

type Expense = z.infer<typeof expenseSchema> & { id: string; created: Date; updated: Date }

// Create collection
export const expensesCollection = createCollection<SelectExpense, Expense>(
  trailBaseCollectionOptions({
    id: 'expenses',
    recordApi: trailBaseClient.records('expenses'),
    getKey: (item) => item.id,
    schema: expenseSchema,
    parse: {
      created: (ts) => new Date(ts * 1000),
      updated: (ts) => new Date(ts * 1000),
    },
    serialize: {
      created: (date) => Math.floor(date.valueOf() / 1000),
      updated: (date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newExpense = transaction.mutations[0].modified
      console.log('Expense created:', newExpense)
    },
  })
)

// CRUD utility functions
export const createExpense = async (name: string, description: string, amount: number, date: string) => {
  if (!name.trim() || !description.trim() || amount < 0 || !date) return;
  await expensesCollection.insert({
    id: uuidv7(),
    name: name.trim(),
    description: description.trim(),
    amount,
    date,
  });
};

export const updateExpense = async (id: string, name: string, description: string, amount: number, date: string) => {
  if (!name.trim() || !description.trim() || amount < 0 || !date) return;
  await expensesCollection.update(id, {
    name: name.trim(),
    description: description.trim(),
    amount,
    date,
    updated: new Date(),
  });
};

export const deleteExpense = async (id: string) => {
  await expensesCollection.delete(id);
};