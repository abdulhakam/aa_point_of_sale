import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'

const trailBaseClient = initClient('http://localhost:4000')

type Category = {
  id: string
  name: string
  created: string
  updated: string
}

export const categoriesCollection = createCollection<Category, string>(
  trailBaseCollectionOptions({
    id: 'categories',
    recordApi: trailBaseClient.records('categories') as any,
    getKey: (item: any) => item.id,
    parse: {},
    serialize: {},
  })
)