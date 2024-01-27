import { useQuery } from "@tanstack/react-query";
import { Flex, Select as SSelect, MultiSelect as MSelect, OptionsFilter, ComboboxItem } from "@mantine/core";
import pb from "@/app/pocketbase";
import CreateRecord from "../CreateRecord/CreateRecord";

export function NSelect(props) {
  const query = useQuery({
    enabled: props.dataQuery ? true : false,
    queryKey: [props.dataQuery?.collectionName || "empty"],
    queryFn: () =>
      pb
        .collection(props.dataQuery.collectionName)
        .getFullList(props.options ? { options: props.options } : {}),
  });

  const optionsFilter: OptionsFilter = ({ options, search }) => {
    const filtered = (options as ComboboxItem[]).filter((option) =>
      option.label.toLowerCase().trim().includes(search.toLowerCase().trim())
    );
  
    filtered.sort((a, b) => a.label.localeCompare(b.label));
    return filtered;
  }
  
  return (
    <Flex align={"end"}>
      {props.multiselect===true ? (
        <MSelect
          w={"100%"}
          filter={props.filter||optionsFilter}
          {...props}
          data={
            props.dataQuery
              ? query.data?.map((dt) => ({
                  value: props.dataQueryValue ? dt[props.dataQueryValue] : dt.name || dt.number || dt.id,
                  label: dt.name || dt.number || dt.id,
                }))
              : props.data
          }
        />
      ) : (
        <SSelect
          w={"100%"}
          {...props}
          data={
            props.dataQuery
              ? query.data?.map((dt) => ({
                  value: props.dataQueryValue ? dt[props.dataQueryValue] : dt.name || dt.number || dt.id,
                  label: dt.name || dt.number || dt.id,
                }))
              : props.data
          }
        />
      )}
      {props.withCreate && <CreateRecord formStructure={props.createForm} />}
    </Flex>
  );
}

export default function Select(props) {
  return <NSelect {...props} />;
}
