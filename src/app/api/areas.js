import pb from "../pocketbase";


/**
 *
 *
 * @export
 * @param {*} data Object
 */
export async function createCustomer(data) {
  
const record = await pb.collection('areas').create(data);
}
export async function viewCustomer(data,expandFields) {
  

}
export async function listCustomers() {

}
export async function searchCustomer(page=1,resultsPerPage=50,filter='') {
}
export async function updateCustomer(data) {
}
export async function deleteCustomer(data) {
}
