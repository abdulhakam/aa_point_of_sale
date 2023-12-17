import pb from "../pocketbase";


export async function createSupplier(data) {
  return await pb.collection("suppliers").create(data);
}
export async function viewSupplier(data,expandFields) {
  await pb.collection('suppliers').getOne(data.id, {
    expand: expandFields,
})
}
export async function listSuppliers() {
  return await pb.collection("suppliers").getFullList({
    sort: "+name",// expand:'items'
  });
}
export async function searchSupplier(page=1,resultsPerPage=50,filter='') {
  await pb.collection('suppliers').getList(page, resultsPerPage, {
    filter: filter,
})
}
export async function updateSupplier(data) {
  const newData = {name:data.name,phone:data.phone,address:data.address,area:data.area}
  await pb.collection('suppliers').update(data.id, newData)
}
export async function deleteSupplier(data) {
  return await pb.collection('suppliers').delete(data.id);
}