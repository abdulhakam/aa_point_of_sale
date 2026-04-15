import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'

const trailBaseClient = initClient('http://localhost:4000')

type Section = {
  id: string
  name: string
  created: string
  updated: string
}

export const sectionsCollection = createCollection<Section, string>(
  trailBaseCollectionOptions({
    id: 'sections',
    recordApi: trailBaseClient.records('sections') as any,
    getKey: (item: any) => item.id,
    parse: {},
    serialize: {},
  })
)