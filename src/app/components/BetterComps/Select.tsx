import { useQuery } from "@tanstack/react-query";
import {
  Flex,
  Select as SSelect,
  MultiSelect as MSelect,
  OptionsFilter,
  ComboboxItem,
  SelectProps,
  MultiSelectProps,
} from "@mantine/core";
import pb from "@/app/pocketbase";
import CreateRecord from "../CreateRecord/CreateRecord";

/**
 * Function to render a select component with optional multi-select and create features.
 *
 * @param {SelectProps & MultiSelectProps & { dataQuery?: { collectionName: string }; dataQueryValue?: string; multiselect?: boolean; withCreate?: boolean; createForm?: { fields: any; collectionName: string; }; options?: { sort?: string; filter?: string; expand?: string }; }} props - the properties for the select component
 * @return {JSX.Element} the rendered select component
 */
export function NSelect(
  props: SelectProps &
    MultiSelectProps & {
      dataQuery?: { collectionName: string };
      dataQueryValue?: string;
      multiselect?: boolean;
      withCreate?: boolean;
      createForm?: {
        fields: any;
        collectionName: string;
      };
      options?: { sort?: string; filter?: string; expand?: string };
      optionsFilter?: OptionsFilter;
    }
) {
  const query = useQuery({
    enabled: props.dataQuery ? true : false,
    queryKey: [props.dataQuery?.collectionName || "empty"],
    queryFn: () =>
      pb
        .collection(props.dataQuery.collectionName)
        .getFullList(props.options ? { ...props.options } : {}),
  });

  const optionsFilter: OptionsFilter = ({ options, search }) => {
    const filtered = (options as ComboboxItem[]).filter((option) =>
      option.label.toLowerCase().trim().includes(search.toLowerCase().trim())
    );

    filtered.sort((a, b) => a.label.localeCompare(b.label));
    return filtered;
  };

  return (
    <Flex align={"end"}>
      {props.multiselect === true ? (
        <MSelect
          w={"100%"}
          filter={props.filter || optionsFilter}
          {...props}
          data={
            props.dataQuery
              ? query.data?.map((dt) => ({
                  value: props.dataQueryValue ? dt[props.dataQueryValue] : dt.name || dt.number || dt.id,
                  label: dt.name || dt.number || String(dt.invoiceNo) || dt.id,
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
