import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'

const trailBaseClient = initClient('http://localhost:4000')

type Item = {
  id: string
  category: string
  company: string
  cost_price: number
  name: string
  sale_price: number
  box_size_qty: number
  created: string
  updated: string
}

export const itemsCollection = createCollection<Item, string>(
  trailBaseCollectionOptions({
    id: 'products',
    recordApi: trailBaseClient.records('products') as any,
    getKey: (item: any) => item.id,
    parse: {},
    serialize: {},
  })
)