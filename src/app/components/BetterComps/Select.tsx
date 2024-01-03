import { useQuery } from "@tanstack/react-query";
import { Flex, Select as MSelect } from "@mantine/core";
import pb from "@/app/pocketbase";
import CreateRecord from "../CreateRecord/CreateRecord";
import { sectionCreateForm } from "@/app/api/sections";

export default function Select(props) {
  const query = useQuery({
    queryKey: [props.dataQuery.collectionName],
    queryFn: () => pb.collection(props.dataQuery.collectionName).getFullList({}),
  });
  return (
    <Flex align={'end'}>
      <MSelect
      w={'100%'}
        {...props}
        data={query.data?.map((dt) => ({
          value: dt.name || dt.number || dt.id,
          label: dt.name || dt.number || dt.id,
        }))}
      />
      <CreateRecord formStructure={sectionCreateForm} />
    </Flex>
  );
}
