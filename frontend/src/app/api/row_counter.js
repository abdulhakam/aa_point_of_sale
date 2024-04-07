import pb from "../pocketbase";
export async function rowCounter() {
  return await pb.collection("counts_for_row_numbers").getOne("1");
}
