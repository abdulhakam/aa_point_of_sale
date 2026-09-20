"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD, { useAppliedFilters } from "@/app/api/useAPI";
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

  // POS-0026 — the report query reads this APPLIED snapshot, so changing the inputs above does
  // not fire a request until the user presses Apply. Reset restores the inputs and it together.
  const { applied, apply, reset, initial } = useAppliedFilters({
    booker: "",
    area: "",
    section: "",
  });

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: "@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;",
  });

  // Fetch pre-aggregated summary from the database view (single fast query).
  // POS-0025 — the view already exposes `party_name`, so the `expand: "party"` was unused payload.
  const summary = useCRUD().fullList({
    collection: "outstanding_summary",
    filter:
      `
      ${applied.booker ? `(booker = "${applied.booker}")` : ""}
      ${applied.booker && applied.area ? " && " : ""}
      ${applied.area ? `(area = "${applied.area}")` : ""}
      ${(applied.booker || applied.area) && applied.section ? " && " : ""}
      ${applied.section ? `(section = "${applied.section}")` : ""}
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
          {/* POS-0026 — request the data only when Apply is pressed. */}
          <Button onClick={() => apply({ ...filters })}>APPLY</Button>
          <Button
            variant='default'
            onClick={() => {
              setFilters({ booker: initial.booker, area: initial.area, section: initial.section });
              reset();
            }}
          >
            Reset
          </Button>
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
                  <Table.Th style={{ maxWidth: 200, width: 200 }}>Invoices</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>Total Amount</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>Total Paid</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>Balance</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.party_name}</Table.Td>
                    <Table.Td style={{ maxWidth: 200, width: 200, whiteSpace: "normal", wordBreak: "break-word" }}>{row.invoice_nos ?? ""}</Table.Td>
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
