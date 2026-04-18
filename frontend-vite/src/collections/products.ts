import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'
import { uuidv7 } from 'uuidv7'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const productSchema = z.object({
  id: z.string().optional(),
  category: z.string(),
  company: z.string(),
  cost_price: z.number(),
  name: z.string(),
  sale_price: z.number(),
  box_size_qty: z.number(),
  created: z.date().optional(),
  updated: z.date().optional(),
})

type SelectProduct = {
  id: string
  category: string
  company: string
  cost_price: number
  name: string
  sale_price: number
  box_size_qty: number
  created: number
  updated: number
}

type Product = z.infer<typeof productSchema> & { id: string; created: Date; updated: Date }

// Create collection
export const productsCollection = createCollection<SelectProduct, Product>(
  trailBaseCollectionOptions({
    id: 'products',
    recordApi: trailBaseClient.records('products'),
    getKey: (item) => item.id,
    schema: productSchema,
    parse: {
      created: (ts) => new Date(ts * 1000),
      updated: (ts) => new Date(ts * 1000),
    },
    serialize: {
      created: (date) => Math.floor(date.valueOf() / 1000),
      updated: (date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newProduct = transaction.mutations[0].modified
      console.log('Product created:', newProduct)
    },
  })
)

// CRUD utility functions
export const createProduct = async (name: string, category: string, company: string, cost_price: number, sale_price: number, box_size_qty: number) => {
  if (!name.trim() || !category || !company || cost_price < 0 || sale_price < 0 || box_size_qty < 0) return;
  await productsCollection.insert({
    id: uuidv7(),
    name: name.trim(),
    category,
    company,
    cost_price,
    sale_price,
    box_size_qty,
  });
};

export const updateProduct = async (id: string, name: string, category: string, company: string, cost_price: number, sale_price: number, box_size_qty: number) => {
  if (!name.trim() || !category || !company || cost_price < 0 || sale_price < 0 || box_size_qty < 0) return;
  await productsCollection.update(id, {
    name: name.trim(),
    category,
    company,
    cost_price,
    sale_price,
    box_size_qty,
    updated: new Date(),
  });
};

export const deleteProduct = async (id: string) => {
  await productsCollection.delete(id);
};