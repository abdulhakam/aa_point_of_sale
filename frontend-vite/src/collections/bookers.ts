import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'

const trailBaseClient = initClient('http://localhost:4000')

type Booker = {
  id: string
  company: string
  name: string
  phone: string
  created: string
  updated: string
}

export const bookersCollection = createCollection<Booker, string>(
  trailBaseCollectionOptions({
    id: 'order_bookers',
    recordApi: trailBaseClient.records('order_bookers') as any,
    getKey: (item: any) => item.id,
    parse: {},
    serialize: {},
  })
)