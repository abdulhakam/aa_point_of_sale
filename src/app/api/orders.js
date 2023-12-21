import pb from '../pocketbase'
export const allOrders = async () => await pb.collection('orders').getFullList({
  sort: '-created',
});