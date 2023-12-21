import pb from '../pocketbase'
export const allTransactions = async () => await pb.collection('transactions').getFullList({
  sort: '-created',
});