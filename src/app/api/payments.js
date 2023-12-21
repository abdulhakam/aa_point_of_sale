import pb from '../pocketbase'
export const allPayments = async () => await pb.collection('payments').getFullList({
  sort: '-created',
});