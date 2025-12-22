"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import PrintContent from "@/app/components/printing/PrintContent";
import { ActionIcon, Button, Group, Select, Stack, Table, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPrinter } from "@tabler/icons-react";
import moment from "moment";
import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

export default function DailySaleReport() {
  const [fromDate, setFromDate] = useState<Date | null>(moment().startOf("day").toDate());
  const [toDate, setToDate] = useState<Date | null>(moment().endOf("day").toDate());
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

  // Calculate filter dates
  // invoice_view filter: date or created? 'dated' is the field usually used for invoice date.
  // Assuming 'dated' or 'created'. `InvoiceForm.tsx` uses `dated`.
  const filterString = useMemo(() => {
     let f = `(dated >= '${moment(fromDate).startOf("day").format("YYYY-MM-DD HH:mm:ss")}' 
       && dated <= '${moment(toDate).endOf("day").format("YYYY-MM-DD HH:mm:ss")}')`;
     f += ` && (type = 'sale')`;
     
     if (filters.booker) f += ` && (booker = "${filters.booker}")`;
     // For area/section, we might need to filter client side if invoice_view doesn't expand party deeply or support deep filter.
     // `invoice_view` usually has `party` which expands to `area`.
     return f;
  }, [fromDate, toDate, filters.booker]);

  const invoices = useCRUD().fullList({
    collection: "invoice_view",
    expand: "party,party.area,party.area.section,booker", 
    filter: filterString,
    sort: "+invoiceNo"
  });
  
  const areas = useCRUD().fullList({ collection: "areas", expand: "section" });
  const bookers = useCRUD().fullList({ collection: "order_bookers" });

  const filteredInvoices = useMemo(() => {
    if (!invoices.data) return [];
    
    return invoices.data.filter((inv) => {
        if (filters.area && inv.expand?.party?.area !== filters.area) return false;
        if (filters.section && inv.expand?.party?.expand?.area?.section !== filters.section) return false;
        return true;
    });

  }, [invoices.data, filters.area, filters.section]);

  const queries = [invoices, areas, bookers];

  if (checkSuccess(queries)) {
    return (
      <Stack p="md">
        <Group>
            <ActionIcon onClick={() => handlePrint && handlePrint()} size="xl" variant="subtle" color="blue">
                <IconPrinter />
            </ActionIcon>
            <DateInput
                value={fromDate}
                onChange={(v) => setFromDate(moment(v).startOf("day").toDate())}
                label="Date From"
            />
            <DateInput
                value={toDate}
                onChange={(v) => setToDate(moment(v).endOf("day").toDate())}
                label="Date To"
            />
        </Group>
        <Group>
            <NSelect
                label="Select Booker"
                data={bookers.data?.map(b => ({ value: b.id, label: b.name })) || []}
                value={filters.booker}
                onChange={(v) => setFilters({ ...filters, booker: v })}
                searchable
                clearable
            />
             <Select
                label="Select Area"
                data={areas.data?.map((a) => ({ value: a.id, label: a.name })) || []}
                value={filters.area}
                onChange={(v) => setFilters({ ...filters, area: v || "" })}
                searchable
                clearable
            />
            <NSelect
                label="Select Section"
                dataQuery={{ collectionName: "sections" }}
                dataQueryValue="id"
                value={filters.section}
                onChange={(v) => setFilters({ ...filters, section: v })}
                searchable
                clearable
            />
             <Button onClick={() => setFilters({ booker: "", area: "", section: "" })}>Reset</Button>
        </Group>

        <div ref={printRef} style={{ padding: "0.5cm" }}>
          <PrintContent>
            <Text size="xl" fw={700} ta="center" mb="md">Daily Sale Report</Text>
             <Text size="sm" ta="center">
                {moment(fromDate).format("DD MMM YYYY")} - {moment(toDate).format("DD MMM YYYY")}
            </Text>
            
            <Table withTableBorder withColumnBorders striped mt="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Invoice No</Table.Th>
                  <Table.Th>Customer Name</Table.Th>
                   <Table.Th>Area</Table.Th>
                   <Table.Th>Booker</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Total Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredInvoices.map((inv) => (
                  <Table.Tr key={inv.id}>
                    <Table.Td>{inv.invoiceNo}</Table.Td>
                    <Table.Td>{inv.expand?.party?.name}</Table.Td>
                    <Table.Td>{inv.expand?.party?.expand?.area?.name}</Table.Td>
                    <Table.Td>{inv.expand?.booker?.name}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{inv.total.toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr style={{ fontWeight: 'bold' }}>
                    <Table.Td colSpan={4}>Total</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{filteredInvoices.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</Table.Td>
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
