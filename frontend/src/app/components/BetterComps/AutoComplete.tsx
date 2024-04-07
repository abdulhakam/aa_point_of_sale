import { useQuery } from "@tanstack/react-query";
import { Autocomplete as MAutocomplete } from "@mantine/core";
import pb from "@/app/pocketbase";

export default function Autocomplete(props) {
  const query = useQuery({
    queryKey: [props.dataQuery.collectionName],
    queryFn: () => pb.collection(props.dataQuery.collectionName).getFullList({})
  });
  return (
    <MAutocomplete
      {...props}
      data={query.data?.map((dt) => ({
        value: dt.name || dt.number || dt.id,
        label: dt.name || dt.number || dt.id,
      }))}
    />
  );
}
