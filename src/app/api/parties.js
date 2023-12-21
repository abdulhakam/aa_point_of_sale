import { useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";
export const createParty = async (data) => {
  const exampleData = {
    id: "pty000000000000",
    name: "test",
    type: "supplier",
    area: "RELATION_RECORD_ID",
    phone: "test",
    address: "test",
    deleted: false,
  };

  return await pb.collection("parties").create(data);
};

export async function getParties() {
  return await pb.collection("parties").getFullList({
    sort: "-created",
  });
}
export const updateParty = async (data) => {
  const record = await pb.collection("parties").update(data.id, data);
};
export const useParties = () => {
  const parties = useQuery({
    queryKey: ["parties"],
    queryFn: getParties,
  });
 const allParties = parties.data
  return {
    allParties,
    customers: allParties? allParties.filter((party) => party.type === "customer" || party.type === "both"):[],
    suppliers: allParties? allParties.filter((party) => party.type === "supplier" || party.type === "both"):[],
    status:parties.status,
    error:parties.error,
  }
};
