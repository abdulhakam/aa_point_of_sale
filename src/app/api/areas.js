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
export async function listAreas() {
  return await pb.collection('areas').getFullList({
    sort: '-created',
});
}
export async function updateArea(data) {
  await pb.collection('areas').update('RECORD_ID', data)
}
export async function deleteArea(data) {
  return await pb.collection('areas').delete(data.id);
}