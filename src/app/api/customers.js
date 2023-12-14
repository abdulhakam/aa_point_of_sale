import pb from "../pocketbase";


export async function createCustomer(data) {
  return await pb.collection("customers").create(data);
}
export async function viewCustomer(data,expandFields) {
  await pb.collection('customers').getOne(data.id, {
    expand: expandFields,
})
}
export async function listCustomers() {
  return await pb.collection("customers").getFullList({
    sort: "+name",expand:"area"
  });
}
export async function searchCustomer(page=1,resultsPerPage=50,filter='') {
  await pb.collection('customers').getList(page, resultsPerPage, {
    filter: filter,
})
}
export async function updateCustomer(data) {
  const newData = {name:data.name,phone:data.phone,address:data.address,area:data.area}
  await pb.collection('customers').update('RECORD_ID', data)
}
export async function deleteCustomer(data) {
  return await pb.collection('customers').delete(data.id);
}
