import { useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";

export function useAreas(){
  return useQuery({queryKey:['areas'],queryFn:listAreas})
}

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