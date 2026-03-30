"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import PrintContent from "@/app/components/printing/PrintContent";
import { ActionIcon, Button, Group, Select, Stack, Table, Text } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

export default function OutstandingPaymentsReport() {
  const [filters, setFilters] = useState({
    booker: "",
    area: "",
    section: "",
  });

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: "@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;",
  });

  // Fetch pre-aggregated summary from the database view (single fast query)
  const summary = useCRUD().fullList({
    collection: "outstanding_summary",
    expand: "party",
    filter:
      `
      ${filters.booker ? `(booker = "${filters.booker}")` : ""}
      ${filters.booker && filters.area ? " && " : ""}
      ${filters.area ? `(area = "${filters.area}")` : ""}
      ${(filters.booker || filters.area) && filters.section ? " && " : ""}
      ${filters.section ? `(section = "${filters.section}")` : ""}
    `.trim() || "",
    sort: "party_name",
  });

  const areas = useCRUD().fullList({ collection: "areas", expand: "section" });

  const queries = [summary, areas];

  const data = summary.data ?? [];

  const totalInvoice = data.reduce((acc, r) => acc + (r.invoice_total ?? 0), 0);
  const totalPaid = data.reduce((acc, r) => acc + (r.paid_total ?? 0), 0);
  const totalBalance = data.reduce((acc, r) => acc + (r.balance ?? 0), 0);

  if (checkSuccess(queries)) {
    return (
      <Stack p='md'>
        <Group>
          <ActionIcon onClick={() => handlePrint && handlePrint()} size='xl' variant='subtle' color='blue'>
            <IconPrinter />
          </ActionIcon>
          <NSelect
            label='Select Booker'
            dataQuery={{ collectionName: "order_bookers" }}
            dataQueryValue='id'
            value={filters.booker}
            onChange={(v) => setFilters({ ...filters, booker: v })}
            searchable
            clearable
          />
          <Select
            label='Select Area'
            data={areas.data?.map((a) => ({ value: a.id, label: a.name })) || []}
            value={filters.area}
            onChange={(v) => setFilters({ ...filters, area: v || "" })}
            searchable
            clearable
          />
          <NSelect
            label='Select Section'
            dataQuery={{ collectionName: "sections" }}
            dataQueryValue='id'
            value={filters.section}
            onChange={(v) => setFilters({ ...filters, section: v })}
            searchable
            clearable
          />
          <Button onClick={() => setFilters({ booker: "", area: "", section: "" })}>Reset</Button>
        </Group>

        <div ref={printRef} style={{ padding: "0.5cm" }}>
          <PrintContent>
            <Text size='xl' fw={700} ta='center' mb='md'>
              Outstanding Payments Report
            </Text>

            <Table withTableBorder withColumnBorders striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Party Name</Table.Th>
                  <Table.Th>Invoices</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>Total Amount</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>Total Paid</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>Balance</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.party_name}</Table.Td>
                    <Table.Td>{row.invoice_nos ?? ""}</Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>{(row.invoice_total ?? 0).toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>{(row.paid_total ?? 0).toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>{(row.balance ?? 0).toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr style={{ fontWeight: "bold" }}>
                  <Table.Td colSpan={2}>Total</Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>{totalInvoice.toFixed(2)}</Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>{totalPaid.toFixed(2)}</Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>{totalBalance.toFixed(2)}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </PrintContent>
        </div>
      </Stack>
    );
  } else {
    return <StatusCheck check={queries} />;
  }
}
