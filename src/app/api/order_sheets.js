import pb from '../pocketbase'
export const listOrderSheets = async() => await pb.collection('order_sheets').getFullList({
  sort: '-created',
});