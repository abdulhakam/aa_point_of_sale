"use client";
import { Table, UnstyledButton, Group, Text, Center, rem } from "@mantine/core";
import { IconSelector, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import classes from "./table.module.css";
import { useState } from "react";

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

function sortData(data: any[], payload: { sortBy: keyof any | null; reversed: boolean; search: string }) {
  const { sortBy } = payload;
  return [...data].sort((a, b) => {
    if (payload.reversed) {
      return b[sortBy].localeCompare(a[sortBy]);
    }

    return a[sortBy].localeCompare(b[sortBy]);
  });
}


export default function ReportTable(props: any) {
  const [sortedData, setSortedData] = useState(props.data);
  const [sortBy, setSortBy] = useState<keyof any | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);
  const setSorting = (field: keyof any) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedData(sortData(props.data, { sortBy: field, reversed }));
  };

  const rows = sortedData.map((row) => (
    <Table.Tr key={row.id}>
      {Object.keys(props.tableStructure).map((key) => (
        <Table.Td key={`${row[key]}-${row.id}`}>{`${row[key]}`}</Table.Td>
      ))}
    </Table.Tr>
  ));
  return (
    <div>
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
    </div>
  );
}
