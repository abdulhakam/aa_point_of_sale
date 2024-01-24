import { useQuery } from "@tanstack/react-query";
import { Flex, Select as MSelect } from "@mantine/core";
import pb from "@/app/pocketbase";
import CreateRecord from "../CreateRecord/CreateRecord";

export default function Select(props) {
  const query = useQuery({
    enabled:props.dataQuery?true:false,
    queryKey: [props.dataQuery?.collectionName||"empty"],
    queryFn: () => pb.collection(props.dataQuery.collectionName).getFullList(props.options?{options:props.options}:{}),
  });
  return (
    <Flex align={'end'}>
      <MSelect
      w={'100%'}
        {...props}
        data={props.dataQuery? query.data?.map((dt) => ({
          value: props.dataQueryValue ? dt[props.dataQueryValue] : dt.name || dt.number || dt.id,
          label: dt.name || dt.number || dt.id,
        })):props.data}
      />
      {props.withCreate && <CreateRecord formStructure={props.createForm} />}
    </Flex>
  );
}
