import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const paymentSchema = z.object({
  id: z.string().optional(),
  amount: z.number(),
  description: z.string(),
  invoice: z.string().optional(),
  paid: z.number(),
  party: z.string().optional(),
  type: z.string(),
  payment_date: z.string(),
  paid_to: z.string(),
  created: z.date().optional(),
  updated: z.date().optional(),
})

type SelectPayment = {
  id: string
  amount: number
  description: string
  invoice?: string
  paid: number
  party?: string
  type: string
  payment_date: string
  paid_to: string
  created: number
  updated: number
}

type Payment = z.infer<typeof paymentSchema> & { id: string; created: Date; updated: Date }

// Create collection
export const paymentsCollection = createCollection<SelectPayment, Payment>(
  trailBaseCollectionOptions({
    id: 'payments',
    recordApi: trailBaseClient.records('payments'),
    getKey: (item) => item.id,
    schema: paymentSchema,
    parse: {
      created: (ts) => new Date(ts * 1000),
      updated: (ts) => new Date(ts * 1000),
    },
    serialize: {
      created: (date) => Math.floor(date.valueOf() / 1000),
      updated: (date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newPayment = transaction.mutations[0].modified
      console.log('Payment created:', newPayment)
    },
  })
)

// CRUD utility functions
export const createPayment = async (amount: number, description: string, invoice: string | undefined, paid: number, party: string | undefined, type: string, payment_date: string, paid_to: string) => {
  if (amount < 0 || !description.trim() || paid < 0 || !type.trim() || !payment_date || !paid_to.trim()) return;
  await paymentsCollection.insert({
    id: uuidv7(),
    amount,
    description: description.trim(),
    invoice,
    paid,
    party,
    type: type.trim(),
    payment_date,
    paid_to: paid_to.trim(),
  });
};

export const updatePayment = async (id: string, amount: number, description: string, invoice: string | undefined, paid: number, party: string | undefined, type: string, payment_date: string, paid_to: string) => {
  if (amount < 0 || !description.trim() || paid < 0 || !type.trim() || !payment_date || !paid_to.trim()) return;
  await paymentsCollection.update(id, {
    amount,
    description: description.trim(),
    invoice,
    paid,
    party,
    type: type.trim(),
    payment_date,
    paid_to: paid_to.trim(),
    updated: new Date(),
  });
};

export const deletePayment = async (id: string) => {
  await paymentsCollection.delete(id);
};