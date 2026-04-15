import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'

const trailBaseClient = initClient('http://localhost:4000')

type Party = {
  id: string
  address: string
  area: string
  name: string
  phone: string
  type: string
  company: string
  created: string
  updated: string
}

export const partiesCollection = createCollection<Party, string>(
  trailBaseCollectionOptions({
    id: 'parties',
    recordApi: trailBaseClient.records('parties') as any,
    getKey: (item: any) => item.id,
    parse: {},
    serialize: {},
  })
)