import { useEffect, useState } from "react";
import { Table, ScrollArea, UnstyledButton, Group, Text, Center, TextInput, rem, keys } from "@mantine/core";
import { IconSelector, IconChevronDown, IconChevronUp, IconSearch } from "@tabler/icons-react";
import classes from "./table.module.css";
import { CustomerViewModal } from "../customers/CustomerView";

interface RowData {
  name: string;
  email: string;
  company: string;
}

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

function filterData(data: RowData[], search: string) {
  const query = search.toLowerCase().trim();
  return data.filter((item) => keys(data[0]).some((key) => item[key].toLowerCase().includes(query)));
}

function sortData(
  data: RowData[],
  payload: { sortBy: keyof RowData | null; reversed: boolean; search: string }
) {
  const { sortBy } = payload;

  if (!sortBy) {
    return filterData(data, payload.search);
  }

  return filterData(
    [...data].sort((a, b) => {
      if (payload.reversed) {
        return b[sortBy].localeCompare(a[sortBy]);
      }

      return a[sortBy].localeCompare(b[sortBy]);
    }),
    payload.search
  );
}

export function ViewTable(props) {
  const [sortedData, setSortedData] = useState(props.data);
  useEffect(()=>{setSortedData(props.data)},[props.data])
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof RowData | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

  const setSorting = (field: keyof RowData) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedData(sortData(props.data, { sortBy: field, reversed, search }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setSortedData(sortData(props.data, { sortBy, reversed: reverseSortDirection, search: value }));
  };
  const properData = sortedData.map((row) => {
    return Object.fromEntries(
      Object.entries(row).filter(([key, value]) => Object.keys(props.tableStructure).includes(key))
    );
  });
  const rows = properData.map((row) => (
    <Table.Tr key={row.id}>
      {Object.keys(props.tableStructure).map((key) => (
        <>
          <Table.Td key={`${row[key]}-${row.id}`}>{`${row[key]}`}</Table.Td>
        </>
      ))}
      <CustomerViewModal key={`edi${row.id}`} data={row} />
    </Table.Tr>
  ));

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
            {Object.keys(props.tableStructure).map((key) => (
              <Th
                key={`tabhead-${key}`}
                sorted={sortBy === `${key}`}
                reversed={reverseSortDirection}
                onSort={() => setSorting(`${key}`)}
              >
                {`${props.tableStructure[key]}`}
              </Th>
            ))}
          </Table.Tr>
        </Table.Tbody>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={Object.keys(props.tableStructure).length}>
                <Text fw={500} ta='center'>
                  Nothing found
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
