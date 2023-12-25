import pb from "../pocketbase";
export const listOrderBookers = async () =>
  await pb.collection("order_bookers").getFullList({
    sort: "-created",
  });
