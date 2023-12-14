import { useEffect, useState } from "react";
import { Table, ScrollArea, UnstyledButton, Group, Text, Center, TextInput, rem, keys } from "@mantine/core";
import { IconSelector, IconChevronDown, IconChevronUp, IconSearch } from "@tabler/icons-react";
import classes from "./table.module.css";
import { CustomerViewModal } from "../app/customers/CustomerView";


function Th({ children, reversed, sorted, onSort }) {
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

function filterData(data, search) {
  const query = search.toLowerCase().trim();
  return data.filter((item) => keys(data[0]).some((key) => item[key].toLowerCase().includes(query)));
}

function sortData(
  data,
  payload
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

function dataProcessor({ data: data, expand: expanded }) {
  console.log(data)
  const updatedArray = data.map((obj) => {
    const replaceProps = expanded.filter((prop) => obj.hasOwnProperty(prop) && obj.expand[prop]);
    return {
      ...obj,
      ...replaceProps.reduce(
        (acc, prop) => ({
          ...acc,
          [prop]: obj.expand[prop].name,
        }),
        {}
      ),
    };
  });
  return updatedArray;
}

export function ViewTable(props) {
  
  const [sortedData, setSortedData] = useState([]);
  useEffect(() => {
    setSortedData(props.expanded.length > 0 ? dataProcessor({ data: props.data, expand: props.expanded }) : props.data);
  }, [props.data,props.expanded]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

  const setSorting = (field) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedData(sortData(sortedData, { sortBy: field, reversed, search }));
  };

  const handleSearchChange = (event) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setSortedData(sortData(sortedData, { sortBy, reversed: reverseSortDirection, search: value }));
  };
  
  const properData = sortedData.map((row) => {
    return Object.fromEntries(
      Object.entries(row).filter(([key, value]) => Object.keys(props.tableStructure).includes(key))
    );
  });
  const rows = properData.map((row) => (
    <Table.Tr key={row.id}>
      {Object.keys(props.tableStructure).map((key) => {
        if (key !== 'id'){                                                                         // remove this condition to enable viewing of ids
        return (
          <>
            <Table.Td key={`${row[key]}-${row.id}`}>{`${row[key]}`}</Table.Td>
          </>
        );}
      })}
      <CustomerViewModal key={`edi${row.id}`} data={row} />
    </Table.Tr>
  ));
  const tableHeaders = Object.keys(props.tableStructure).map((key) => (
    <Th
      key={`tabhead-${key}`}
      sorted={sortBy === `${key}`}
      reversed={reverseSortDirection}
      onSort={() => setSorting(`${key}`)}
    >
      {`${props.tableStructure[key]}`}
    </Th>
  ));
  tableHeaders.shift();
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
          <Table.Tr>{tableHeaders}</Table.Tr>
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
