"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import PrintContent from "@/app/components/printing/PrintContent";
import { ActionIcon, Button, Flex, Group, Select, Stack, Table, Text } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { DataTableColumn } from "mantine-datatable";
import { useRef, useState, useMemo } from "react";
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

  // Fetch necessary data
  const payments = useCRUD().fullList({
    collection: "payments_view",
    expand: "invoice,party,area,section,booker",
    filter: `(paid = false) && (invoice != "")
      ${filters.booker ? `&& (booker = "${filters.booker}")` : ""}
      ${filters.area ? `&& (area = "${filters.area}")` : ""}
      ${filters.section ? `&& (section = "${filters.section}")` : ""}
    `,
  });
  
  const areas = useCRUD().fullList({ collection: "areas", expand: "section" });

  const processData = (paymentsData: any[]) => {
    const partyMap: Record<string, {
      partyName: string;
      invoices: Set<string>;
      totalAmount: number;
      totalPaid: number;
    }> = {};

    paymentsData.forEach((record) => {
        const partyId = record.party;
        if (!partyMap[partyId]) {
            partyMap[partyId] = {
                partyName: record.expand?.party?.name || "Unknown Party",
                invoices: new Set(),
                totalAmount: 0,
                totalPaid: 0
            };
        }
        
        partyMap[partyId].invoices.add(record.expand?.invoice?.invoiceNo || record.invoice);
        
        // In payments_view:
        // type 'recieving' with paid=false -> usually the invoice amount (receivable)
        // type 'recieving' with paid=true -> payment made
        // But here we are filtering by paid=false only? 
        // Wait, the user wants "Outstanding Payments".
        // If I only fetch paid=false, I get the unpaid invoice amounts.
        // But to calculate balance, I need to know if partial payments were made?
        // Actually, in this system, it seems:
        // 1. Invoice created -> 'recieving', paid=false, amount = invoice total.
        // 2. Payment made -> 'recieving', paid=true, amount = paid amount.
        
        // However, my filter above says `paid = false`. This will only fetch the original invoice records which are not marked as fully paid?
        // Or does 'paid=true' record exist separately?
        // Let's look at PaymentsView.tsx logic:
        // recieving += pmnt.amount (if !paid) -> Invoice Total
        // recieved += pmnt.amount (if paid) -> Paid Amount
        
        // If I only fetch `paid=false`, I'm only seeing the invoice amounts.
        // I need to fetch ALL payments related to these parties/invoices to calculate true balance?
        // OR does the user just want "invoices not completely paid"?
        // If an invoice is partially paid, we typically have the original invoice record (paid=false) AND a payment record (paid=true).
        // So capturing `paid=false` gives us the Full Invoice Amount.
        // We also need `paid=true` records for the same invoices to subtract and show "Total Paid".
        
        // PROBLEM: My filter is `paid = false`. I won't get the payments.
        // I should probably remove `paid=false` from the filter and do aggregation in JS, 
        // OR fetch all payments for the relevant parties.
        // Given the prompt "only those which are not completely paid", 
        // I should probably fetch ALL 'recieving' items for the filtered scope, then group by party.
    });
    
    // Re-implementation inside the component
    return [];
  };

  // Correct approach: Fetch all 'recieving' records (both paid and unpaid) to calculate per-party balance.
  // Then filter out parties with 0 balance.
  
  const allPayments = useCRUD().fullList({
    collection: "payments_view",
    expand: "invoice,party,booker",
    filter: `(type = "recieving" || type = "return") 
      ${filters.booker ? `&& (booker = "${filters.booker}")` : ""}
      ${filters.area ? `&& (area = "${filters.area}")` : ""}
      ${filters.section ? `&& (section = "${filters.section}")` : ""}
    `,
  });

  const aggregatedData = useMemo(() => {
    if (!allPayments.data) return [];
    
    // First, track each invoice separately
    const invoiceStats: Record<string, {
      invoiceNo: string;
      partyId: string;
      partyName: string;
      invoiceTotal: number;
      paidTotal: number;
      returnTotal: number;
    }> = {};

    allPayments.data.forEach((p) => {
        const pId = p.party;
        const invId = p.invoice;
        if (!pId || !invId) return;
        
        const invNo = p.expand?.invoice?.invoiceNo?.toString() || invId;
        const key = `${pId}_${invId}`;
        
        if (!invoiceStats[key]) {
            invoiceStats[key] = {
                invoiceNo: invNo,
                partyId: pId,
                partyName: p.expand?.party?.name || "Unknown",
                invoiceTotal: 0,
                paidTotal: 0,
                returnTotal: 0
            };
        }
        
        if (p.type === "return") {
            // Returns from customers reduce the outstanding balance
            if (p.expand?.party?.type === "customer") {
                invoiceStats[key].returnTotal += (p.amount || 0);
            }
        } else if (p.paid) {
            invoiceStats[key].paidTotal += (p.amount || 0);
        } else {
            invoiceStats[key].invoiceTotal += (p.amount || 0);
        }
    });

    // Now aggregate by party, only including invoices with outstanding balance
    const partyStats: Record<string, {
      id: string;
      name: string;
      invoices: Set<string>;
      invoiceTotal: number;
      paidTotal: number;
      returnTotal: number;
    }> = {};

    Object.values(invoiceStats).forEach((inv) => {
        const balance = inv.invoiceTotal - inv.paidTotal - inv.returnTotal;
        
        // Only include invoices with outstanding balance
        if (Math.abs(balance) > 0.1) {
            if (!partyStats[inv.partyId]) {
                partyStats[inv.partyId] = {
                    id: inv.partyId,
                    name: inv.partyName,
                    invoices: new Set(),
                    invoiceTotal: 0,
                    paidTotal: 0,
                    returnTotal: 0
                };
            }
            
            partyStats[inv.partyId].invoices.add(inv.invoiceNo);
            partyStats[inv.partyId].invoiceTotal += inv.invoiceTotal;
            partyStats[inv.partyId].paidTotal += inv.paidTotal;
            partyStats[inv.partyId].returnTotal += inv.returnTotal;
        }
    });

    return Object.values(partyStats)
        .map(p => ({
            ...p,
            balance: p.invoiceTotal - p.paidTotal - p.returnTotal,
            invoiceList: Array.from(p.invoices).sort((a, b) => {
                const numA = parseInt(a) || 0;
                const numB = parseInt(b) || 0;
                return numA - numB;
            }).join(", ")
        }))
        .filter(p => Math.abs(p.balance) > 0.1); // significantly non-zero
  }, [allPayments.data]);

  const queries = [allPayments, areas];

  if (checkSuccess(queries)) {
    return (
      <Stack p="md">
        <Group>
            <ActionIcon onClick={() => handlePrint && handlePrint()} size="xl" variant="subtle" color="blue">
                <IconPrinter />
            </ActionIcon>
            <NSelect
                label="Select Booker"
                dataQuery={{ collectionName: "order_bookers" }}
                dataQueryValue="id"
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
            <Text size="xl" fw={700} ta="center" mb="md">Outstanding Payments Report</Text>
            
            <Table withTableBorder withColumnBorders striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Party Name</Table.Th>
                  <Table.Th>Invoices</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Total Amount</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Total Paid</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Balance</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {aggregatedData.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.name}</Table.Td>
                    <Table.Td>{row.invoiceList}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{row.invoiceTotal.toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{row.paidTotal.toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{row.balance.toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
                 <Table.Tr style={{ fontWeight: 'bold' }}>
                    <Table.Td colSpan={2}>Total</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{aggregatedData.reduce((acc, curr) => acc + curr.invoiceTotal, 0).toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{aggregatedData.reduce((acc, curr) => acc + curr.paidTotal, 0).toFixed(2)}</Table.Td>
                     <Table.Td style={{ textAlign: 'right' }}>{aggregatedData.reduce((acc, curr) => acc + curr.balance, 0).toFixed(2)}</Table.Td>
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
