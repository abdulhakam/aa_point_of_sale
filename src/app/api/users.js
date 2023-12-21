import { useQuery } from '@tanstack/react-query';
import pb from '../pocketbase'
export async function getUser(id){
  return await pb.collection('users').getOne(id);
}

export async function listUsers(){
  return await pb.collection('users').getFullList({
    sort: '-created',
});
}