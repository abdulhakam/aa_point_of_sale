import pb from "../pocketbase";

/**
 * creates an area record
 *
 * @param {object} data The data object containing information about the area.
 * @property {string} data.name The name of the area.
 * @property {string[]} data.suppliers An array of supplier IDs related to the area.
 * @property {string[]} data.customers An array of customer IDs related to the area.
 * @returns {Promise} Returns the the info of the area.
 */
export async function createArea(data) {
  return await pb.collection("areas").create(data);
}
export async function viewArea(data,expandFields) {
  await pb.collection('areas').getOne(data.id, {
    expand: expandFields,
})
}
export async function listAreas() {
  return await pb.collection('areas').getFullList({
    sort: '-created',
});
}
export async function searchArea(page=1,resultsPerPage=50,filter='') {
  await pb.collection('areas').getList(page, resultsPerPage, {
    filter: filter,
})
}
export async function updateArea(data) {
  const newData = {name:data.name,phone:data.phone,address:data.address,area:data.area}
  await pb.collection('areas').update('RECORD_ID', data)
}
export async function deleteArea(data) {
  return await pb.collection('areas').delete(data.id);
}