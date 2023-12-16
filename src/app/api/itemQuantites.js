import pb from "../pocketbase";


export async function createItem(data) {
  return await pb.collection("items").create(data);
}
export async function viewItem(data,expandFields) {
  await pb.collection('items').getOne(data.id, {
    expand: expandFields,
})
}
export async function listItems() {
  return await pb.collection("items").getFullList({
    sort: "+name",expand:'qty.qty,category'
  });
}
export async function searchItem(page=1,resultsPerPage=50,filter='') {
  await pb.collection('items').getList(page, resultsPerPage, {
    filter: filter,
})
}
export async function updateItem(data) {
  const newData = {name:data.name,phone:data.phone,address:data.address,area:data.area}
  await pb.collection('items').update(data.id, newData)
}
export async function deleteItem(data) {
  return await pb.collection('items').delete(data.id);
}