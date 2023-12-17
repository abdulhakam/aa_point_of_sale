"use client";
import { Table, UnstyledButton, Group, Text, Center, rem } from "@mantine/core";
import { IconSelector, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import classes from "./table.module.css";
import { useState } from "react";

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

function sortData(data, payload) {
  const { sortBy } = payload;
  return [...data].sort((a, b) => {
    const valueA = a[sortBy];
    const valueB = b[sortBy];

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      // Numeric comparison
      return payload.reversed ? valueB - valueA : valueA - valueB;
    } else {
      // String comparison
      const stringValueA = String(valueA);
      const stringValueB = String(valueB);
      return payload.reversed ? stringValueB.localeCompare(stringValueA) : stringValueA.localeCompare(stringValueB);
    }
  });
}

function dataProcessor({ data, expand }) {
  return data.map((obj) => {
    const expandedProps = Object.entries(obj.expand || {})
      .filter(([prop, value]) => expand.includes(prop) && value && (value.name||value.value))
      .reduce((acc, [prop, val]) => ({ ...acc, [prop]: val.name||val.value }), {});
      console.log({...obj,...expandedProps})

    return { ...obj, ...expandedProps };
  });
}

export default function ReportTable(props) {
  const structure = props.tableStructure;
  const properData =
    props.expanded.length > 0 ? dataProcessor({ data: props.data, expand: props.expanded }) : props.data;
  const [sortedData, setSortedData] = useState(properData);
  const [sortBy, setSortBy] = useState(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);
  const setSorting = (field) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedData(sortData(properData, { sortBy: field, reversed }));
  };

  const rows = sortedData.map((row) => (
    <Table.Tr key={row.id}>
      {Object.keys(structure).map((key) => (
        <Table.Td key={`${row[key]}-${row.id}`}>{`${row[key]}`}</Table.Td>
      ))}
    </Table.Tr>
  ));
  return (
    <div>
      <Table horizontalSpacing='md' verticalSpacing='xs' miw={700} layout='fixed'>
        <Table.Tbody>
          <Table.Tr>
            {Object.keys(structure).map((key) => (
              <Th
                key={`tabhead-${key}`}
                sorted={sortBy === `${key}`}
                reversed={reverseSortDirection}
                onSort={() => setSorting(`${key}`)}
              >
                {`${structure[key]}`}
              </Th>
            ))}
          </Table.Tr>
        </Table.Tbody>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={Object.keys(structure).length}>
                <Text fw={500} ta='center'>
                  Nothing found
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
}
