import pb from "../../pocketbase";

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  address: string;
}

export async function createCustomer(data: Customer) {
  return await pb.collection("customers").create(data);
}
export async function viewCustomer(data: Customer) {}
export async function listCustomers() {
  return await pb.collection("customers").getFullList({
    sort: "+name",
  });
}
export async function searchCustomer(data: Customer) {}
export async function updateCustomer(data: Customer) {}
export async function deleteCustomer(data: Customer) {
  return await pb.collection('customers').delete(data.id);
}
