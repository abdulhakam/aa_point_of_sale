import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'

const trailBaseClient = initClient('http://localhost:4000')

// Define schema
const userSchema = z.object({
  id: z.string(),
  email: z.string().optional(),
  name: z.string(),
  username: z.string(),
  created: z.date().optional(),
  updated: z.date().optional(),
})

type SelectUser = {
  id: string
  email?: string
  name: string
  username: string
  created: number
  updated: number
}

type User = z.infer<typeof userSchema> & { id: string; created: Date; updated: Date }

// Create collection
export const usersCollection = createCollection<SelectUser, User>(
  trailBaseCollectionOptions({
    id: 'users',
    recordApi: trailBaseClient.records('users'),
    getKey: (item) => item.id,
    schema: userSchema,
    parse: {
      created: (ts) => new Date(ts * 1000),
      updated: (ts) => new Date(ts * 1000),
    },
    serialize: {
      created: (date) => Math.floor(date.valueOf() / 1000),
      updated: (date) => Math.floor(date.valueOf() / 1000),
    },
    onInsert: async ({ transaction }) => {
      const newUser = transaction.mutations[0].modified
      console.log('User created:', newUser)
    },
  })
)

// CRUD utility functions
export const createUser = async (name: string, username: string, email?: string) => {
  if (!name.trim() || !username.trim()) return;
  await usersCollection.insert({
    id: uuidv7(),
    name: name.trim(),
    username: username.trim(),
    email,
  });
};

export const updateUser = async (id: string, name: string, username: string, email?: string) => {
  if (!name.trim() || !username.trim()) return;
  await usersCollection.update(id, {
    name: name.trim(),
    username: username.trim(),
    email,
    updated: new Date(),
  });
};

export const deleteUser = async (id: string) => {
  await usersCollection.delete(id);
};