import pb from "../pocketbase";


export async function createItemQty(data) {
  return await pb.collection("items_qty").create(data);
}
export async function viewItemQty(data,expandFields) {
  await pb.collection('items_qty').getOne(data.id)
}
export async function listItemsQty() {
  return await pb.collection("items_qty").getFullList({
    sort: "+created"
  });
}
export async function updateItemQty(data) {
  const newData = {name:data.name,phone:data.phone,address:data.address,area:data.area}
  await pb.collection('items_qty').update(data.id, newData)
}
export async function deleteItemQty(data) {
  return await pb.collection('items_qty').delete(data.id);
}