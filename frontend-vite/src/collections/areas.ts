import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'

const trailBaseClient = initClient('http://localhost:4000')

type Area = {
  id: string
  name: string
  section: string
  created: string
}

export const areasCollection = createCollection<Area, string>(
  trailBaseCollectionOptions({
    id: 'areas',
    recordApi: trailBaseClient.records('areas') as any,
    getKey: (item: any) => item.id,
    parse: {},
    serialize: {},
  })
)