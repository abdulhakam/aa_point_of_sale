import { useQuery } from "@tanstack/react-query";
import pb from "../pocketbase";
import { FormStructure, Party } from "./types";
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
    sort: "-created",expand:'area'
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
    isLoading:parties.isLoading,
    status:parties.status,
    error:parties.error,
  }
};


export const partyFormStructure: FormStructure<Party> = {
  fields: {
    id: { type: "autocomplete", default: undefined, baseProps: { label: "id", data: [] } },
    created: { type: "datetime", default: undefined, baseProps: { label: "Created" } },
    updated: { type: "datetime", default: undefined, baseProps: { label: "Updated" } },
    name: { type: "text", default: "", baseProps: { label: "Name" } },
    type: { type:'select', default:undefined,baseProps:{label:'Type',data:['customer','supplier','both']}},
    area: {type:'select', default:undefined,baseProps:{label:'Area',searchable:true,data:[]}},
    phone: { type: "text", default: undefined, baseProps: { label: "Phone" } },
    address: { type: "text", default: undefined, baseProps: { label: "Address" } },
    deleted: { type: 'switch', default:false, baseProps:{label:'deleted'}}
  },
  collectionName:'parties',
  onCreate: (data) => createParty(data),
  onUpdate: (data) => updateParty(data),
  onDelete: (data) => {
    updateParty({ ...data, deleted: true });
  },
};