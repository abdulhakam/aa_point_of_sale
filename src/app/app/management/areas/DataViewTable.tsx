"use client";
import { useEffect, useState } from "react";
import { Table, ScrollArea, UnstyledButton, Group, Text, Center, TextInput, rem, keys } from "@mantine/core";
import { IconSelector, IconChevronDown, IconChevronUp, IconSearch } from "@tabler/icons-react";
import classes from "./table.module.css";
import InfoViewModal from "./InfoViewModal";

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

function sortData(data, payload) {
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

function dataProcessor({ data }) {
  return data.map((obj) => {
    const expandedProps = Object.entries(obj.expand || {})
      .filter(([prop, value]) => value && value.name)
      .reduce((acc, [prop, value]) => ({ ...acc, [prop]: value }), {});

    return { ...obj, ...expandedProps };
  });
}

export function DataViewTable({ tableStructure, formStructure={}, expanded = [], data }) {
  const [sortedData, setSortedData] = useState([]);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ field: null, reversed: false });

  useEffect(() => {
    const updatedData = expanded?.length > 0 ? dataProcessor({ data: data }) : data;
    updateSortedData(updatedData);
  }, [data]);

  const updateSortedData = (data) => {
    setSortedData(sortData(data, { sortBy: sortConfig.field, reversed: sortConfig.reversed, search }));
  };

  const setSorting = (field) => {
    const reversed = field === sortConfig.field ? !sortConfig.reversed : false;
    setSortConfig({ field, reversed });
    updateSortedData(sortedData);
  };

  const handleSearchChange = (event) => {
    const { value } = event.currentTarget;
    setSearch(value);
    updateSortedData(sortedData);
  };

  const renderTableHeaders = Object.keys(tableStructure).map(
    (key) =>
      !tableStructure?.hidden_columns?.includes(key) && (
        <Th
          key={`tabhead-${key}`}
          sorted={sortConfig.field === key}
          reversed={sortConfig.reversed}
          onSort={() => setSorting(key)}
        >
          {tableStructure[key]}
        </Th>
      )
  );

  const properData = sortedData.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([key]) => Object.keys(tableStructure).includes(key)))
  );
  const renderRows = properData.map((row) => (
    <InfoViewModal key={`tablerow-${row.id}`} data={row} formStructure={formStructure} tableStructure={tableStructure}>
      {Object.keys(tableStructure).map((key) => {
        return (
          <Table.Td key={`${[key]}-${row.id}`}>
            {typeof row[key] !== "object" ? `${row[key]}` : `${row[key].name}`}
          </Table.Td>
        );
      })}
    </InfoViewModal>
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
          <Table.Tr>{renderTableHeaders}</Table.Tr>
        </Table.Tbody>
        <Table.Tbody>
          {properData.length > 0 ? (
            renderRows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={Object.keys(tableStructure).length}>
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
