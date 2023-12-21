import pb from "../pocketbase";

//TODO: remove all useless code

// export async function createItemCategory(data) {
//   return await pb.collection("categories").create(data);
// }
// export async function viewItemCategory(data,expandFields) {
//   await pb.collection('categories').getOne(data.id, {
//     expand: expandFields,
// })
// }

// export async function searchItemCategory(page=1,resultsPerPage=50,filter='') {
//   await pb.collection('categories').getList(page, resultsPerPage, {
//     filter: filter,
// })
// }
export async function listItemCategories() {
  return await pb.collection("categories").getFullList({
    sort: "+name"
  });
}
export async function updateItemCategory(data) {
  const newData = {name:data.name,phone:data.phone,address:data.address,area:data.area}
  await pb.collection('categories').update(data.id, newData)
}
export async function deleteItemCategory(data) {
  return await pb.collection('categories').delete(data.id);
}