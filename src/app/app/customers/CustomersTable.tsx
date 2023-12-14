import { useEffect, useState } from "react";
import { Table, ScrollArea, UnstyledButton, Group, Text, Center, TextInput, rem, keys, Button } from "@mantine/core";
import { IconSelector, IconChevronDown, IconChevronUp, IconSearch } from "@tabler/icons-react";
import classes from "./TableSort.module.css";
import { CustomerViewModal } from "./CustomerView";
import { Customer } from "./customers";

interface ThProps {
  children: React.ReactNode;
  reversed: boolean;
  sorted: boolean;
  onSort(): void;
}

function Th({ children, reversed, sorted, onSort }: ThProps) {
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <Table.Th className={classes.th}>
      <UnstyledButton onClick={onSort} className={classes.control}>
        <Group justify='space-between'>
          <Text fw={500} fz='sm'>
            {children}
          </Text>
          <Center className={classes.icon}>
            <Icon style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
          </Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

function filterData(data: Customer[], search: string) {
  const query = search.toLowerCase().trim();
  return data.filter((item) =>
    keys(data[0]).some((key) => item[key].toString().toLowerCase().includes(query))
  );
}

function sortData(
  data: Customer[],
  payload: { sortBy: keyof Customer | null; reversed: boolean; search: string }
) {
  const { sortBy } = payload;

  if (!sortBy) {
    return filterData(data, payload.search);
  }

  return filterData(
    [...data].sort((a, b) => {
      if (payload.reversed) {
        return b[sortBy].toString().localeCompare(a[sortBy]);
      }

      return a[sortBy].toString().localeCompare(b[sortBy]);
    }),
    payload.search
  );
}

export default function CustomersTable(props: {data:Customer[]}) {
  const [sortedData, setSortedData] = useState(props.data);
  useEffect(()=>{setSortedData(props.data)},[props.data])
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof Customer | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);
  const setSorting = (field: keyof Customer) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedData(sortData(sortedData, { sortBy: field, reversed, search }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setSortedData(sortData(sortedData, { sortBy, reversed: reverseSortDirection, search: value }));
  };
  console.log(sortedData)
  const rows = sortedData.map((row: any) => (
    <Table.Tr key={row.id}>
      <Table.Td>{row.id}</Table.Td>
      <Table.Td>{row.name}</Table.Td>
      <Table.Td>{row.address}</Table.Td>
      <Table.Td>{row.phone}</Table.Td>
      <Table.Td><CustomerViewModal data={row}/></Table.Td>
    </Table.Tr>
  ));
  if (sortedData.length>0){
  return (
    <ScrollArea>
      <TextInput
        placeholder='Search by any field'
        mb='md'
        leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
        value={search}
        onChange={handleSearchChange}
      />
      <Table horizontalSpacing='md' verticalSpacing='xs' miw={700} layout='fixed'>
        <Table.Tbody>
          <Table.Tr>
          <Th sorted={sortBy === "id"} reversed={reverseSortDirection} onSort={() => setSorting("id")}>
              id
            </Th>
            <Th sorted={sortBy === "name"} reversed={reverseSortDirection} onSort={() => setSorting("name")}>
              Name
            </Th>
            <Th
              sorted={sortBy === "address"}
              reversed={reverseSortDirection}
              onSort={() => setSorting("address")}
            >
              Address
            </Th>
            <Th
              sorted={sortBy === "phone"}
              reversed={reverseSortDirection}
              onSort={() => setSorting("phone")}
            >
              Phone
            </Th>
          </Table.Tr>
        </Table.Tbody>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={Object.keys(sortedData[0]).length}>
                <Text fw={500} ta='center'>
                  Nothing found
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );}
  else {return <h1>No Data Available</h1>}
}



