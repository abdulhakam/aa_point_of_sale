import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const orderBookerSchema = z.object({
  id: z.string().optional(),
  company: z.string(),
  name: z.string(),
  phone: z.string(),
  created: z.date().optional(),
  updated: z.date().optional(),
})

type SelectOrderBooker = {
  id: string
  company: string
  name: string
  phone: string
  created: number
  updated: number
}

type OrderBooker = z.infer<typeof orderBookerSchema> & { id: string; created: Date; updated: Date }

// Create collection
export const orderBookersCollection = createCollection<SelectOrderBooker, OrderBooker>(
  trailBaseCollectionOptions({
    id: 'order_bookers',
    recordApi: trailBaseClient.records('order_bookers'),
    getKey: (item) => item.id,
    schema: orderBookerSchema,
    parse: {
      created: (ts) => new Date(ts * 1000),
      updated: (ts) => new Date(ts * 1000),
    },
    serialize: {
      created: (date) => Math.floor(date.valueOf() / 1000),
      updated: (date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newOrderBooker = transaction.mutations[0].modified
      console.log('OrderBooker created:', newOrderBooker)
    },
  })
)

// CRUD utility functions
export const createOrderBooker = async (name: string, phone: string, company: string) => {
  if (!name.trim() || !phone.trim() || !company.trim()) return;
  await orderBookersCollection.insert({
    id: uuidv7(),
    name: name.trim(),
    phone: phone.trim(),
    company: company.trim(),
  });
};

export const updateOrderBooker = async (id: string, name: string, phone: string, company: string) => {
  if (!name.trim() || !phone.trim() || !company.trim()) return;
  await orderBookersCollection.update(id, {
    name: name.trim(),
    phone: phone.trim(),
    company: company.trim(),
    updated: new Date(),
  });
};

export const deleteOrderBooker = async (id: string) => {
  await orderBookersCollection.delete(id);
};