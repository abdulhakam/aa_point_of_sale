import pb from "@/app/pocketbase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const crud = {
  create: async ({ collection, data }) => await pb.collection(collection).create(data),
  read: async ({ collection, recordID, expand = "" }) =>
    await pb.collection(collection).getOne(recordID, {
      expand: expand,
    }),
  update: async ({ collection, data, recordID }) => {
    await pb.collection(collection).update(recordID, data);
  },
  remove: async ({ collection, recordID }) => {
    await pb.collection(collection).delete(recordID);
  },
  listall: async ({ collection, expand = "", filter = "", sort = "-created"}) => {
    await pb.collection(collection).getFullList({
      sort: sort,
      expand: expand,
      filter: filter,
    });
  },
};

/////////////////////////CREATE///////////////////////////////////
export const useCreate = ({ collection, data }) => {
  const qc = useQueryClient();
  useMutation({
    mutationFn: async () => await pb.collection(collection).create(data),
    onSuccess: () => qc.invalidateQueries(collection),
  });
};
/////////////////////////READ/////////////////////////////////////
export const useRead = ({ collection, recordID, expand = "" }) => {
  return useQuery({
    queryKey: [collection, recordID],
    queryFn: async () =>
      await pb.collection(collection).getOne(recordID, {
        expand: expand,
      }),
  });
};
/////////////////////////UPDATE///////////////////////////////////
export const useUpdate = ({ collection, data, recordID }) => {
  const qc = useQueryClient();
  useMutation({
    mutationFn: async () => await pb.collection(collection).update(recordID, data),
    onSuccess: () => qc.invalidateQueries(collection),
  });
};
/////////////////////////DELETE///////////////////////////////////
export const useDelete = ({ collection, recordID }) => {
  const qc = useQueryClient();
  useMutation({
    mutationFn: async () => await pb.collection(collection).delete(recordID),
    onSuccess: () => qc.invalidateQueries(collection),
  });
};
/////////////////////////FULL LIST ///////////////////////////////
export function useFullList({
  collection,
  expand = "",
  filter = "",
  sort = "-created",
  queryKey = collection,
}) {
  return useQuery({
    queryKey: [queryKey, expand, filter],
    queryFn: async () =>
      await pb.collection(collection).getFullList({
        sort: sort,
        expand: expand,
        filter: filter,
      }),
  });
}

export default function useCRUD() {
  return { create: useCreate, read: useRead, update: useUpdate, remove: useDelete, fullList: useFullList };
}
