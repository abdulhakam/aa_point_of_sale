import pb from "@/app/pocketbase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";



export default function useCRUD() {
  const qc = useQueryClient();
  /////////////////////////CREATE///////////////////////////////////
  const useCreate = ({ collection, data }) => {
    useMutation({
      mutationFn: async () => await pb.collection(collection).create(data),
      onSuccess: () => qc.invalidateQueries(collection),
    });
  };
  /////////////////////////READ/////////////////////////////////////
  const useRead = ({ collection, recordID, expand = "" }) =>
    {return useQuery({
      queryKey: [collection, recordID],
      queryFn: async () =>
        await pb.collection(collection).getOne(recordID, {
          expand: expand,
        }),
    });}
  /////////////////////////UPDATE///////////////////////////////////
  const useUpdate = ({ collection, data, recordID }) => {
    useMutation({
      mutationFn: async () => await pb.collection(collection).update(recordID, data),
      onSuccess: () => qc.invalidateQueries(collection),
    });
  };
  /////////////////////////DELETE///////////////////////////////////
  const useDelete = ({ collection, recordID }) => {
    useMutation({
      mutationFn: async () => await pb.collection(collection).delete(recordID),
      onSuccess: () => qc.invalidateQueries(collection),
    });
  };
  /////////////////////////FULL LIST ///////////////////////////////
  function useFullList({ collection, expand = "", filter = "", sort = "-created" ,queryKey=collection}) {
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
  return { create: useCreate, read: useRead, update: useUpdate, remove: useDelete, fullList: useFullList };
}