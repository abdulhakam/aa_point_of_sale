import pb from '../pocketbase'
export const getAllPermissions = async () => await pb.collection('permissions').getFullList({
  sort: '-created',
});