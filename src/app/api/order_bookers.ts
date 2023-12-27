import { useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";
import { FormStructure, OrderBooker } from "./types";

export async function createOrderBooker(data) {
  return await pb.collection("order_bookers").create(data);
}
export function useOrderBookers() {
  const {data,isLoading,status,error} =  useQuery({ queryKey: ["areas"], queryFn: listOrderBookers })
  return {data,isLoading,status,error}
}
export async function updateOrderBooker(data){
  const rid = data.id
  const ndata = data
  delete ndata.id
  delete ndata.created
  delete ndata.updated
return await pb.collection('order_bookers').update(rid, ndata);}

export const listOrderBookers = async () =>
  await pb.collection("order_bookers").getFullList({
    sort: "-created",
});

export const orderBookerFormStructure: FormStructure<OrderBooker> = {
    fields: {
      created: { type: "datetime", baseProps: { label: "Created", readOnly: true, variant: "unstyled" } },
      updated: { type: "datetime", baseProps: { label: "Updated", readOnly: true, variant: "unstyled" } },
      id: { type: "autocomplete", baseProps: { label: "id", readOnly: true, variant: "unstyled" } },
      name: { type: "text", baseProps: { label: "Name" } },
      phone: { type: "text", baseProps: { label: "Phone" } },
      deleted: { type: "switch", baseProps: { label: "DELETED", disabled: true } },
    },
    onCreate: (data) => createOrderBooker(data),
    onUpdate: (data) => updateOrderBooker(data),
    onDelete: (data) => {
      updateOrderBooker({ ...data, deleted: true });
    },
};