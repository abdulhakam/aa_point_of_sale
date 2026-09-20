"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD, { useAppliedFilters } from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import PrintContent from "@/app/components/printing/PrintContent";
import { ActionIcon, Button, Group, Select, Stack, Table, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { IconPrinter } from "@tabler/icons-react";
import moment from "moment";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { qtyDisplay, getQtyFromString } from "@/app/components/functions/qtyParser";

export default function ProductSaleReport() {
  const [fromDate, setFromDate] = useState<Date | null>(moment().startOf("day").toDate());
  const [toDate, setToDate] = useState<Date | null>(moment().endOf("day").toDate());
  
  const form = useForm({
    initialValues: {
      booker: "" as any,
      area: "" as any,
      section: "" as any,
    },
  });

  // POS-0026 — the report query reads this APPLIED snapshot, so changing the inputs above does
  // not fire a request until the user presses Apply. Reset restores the inputs and it together.
  const { applied, apply, reset, initial } = useAppliedFilters({
    fromDate: moment().startOf("day").toDate() as Date | null,
    toDate: moment().endOf("day").toDate() as Date | null,
    booker: "",
    area: "",
    section: "",
  });

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: "@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;",
  });

  // POS-0025 — this report only needs each line's item/qty/total (names come from the `items`
  // collection), so the former `item,invoice,invoice.party,invoice.party.area,...` expand was
  // pure payload and has been removed.
  const transactions = useCRUD().fullList({
    collection: "transaction_view",
    filter: `(type = "sale")
            && (created >= '${moment(applied.fromDate).startOf("day").format("YYYY-MM-DD HH:mm:ss")}' 
            && created <= '${moment(applied.toDate).endOf("day").format("YYYY-MM-DD HH:mm:ss")}')
            ${applied.booker ? `&& (invoice.booker = "${applied.booker}")` : ""}
            ${applied.area ? `&& (invoice.party.area = "${applied.area}")` : ""}
            ${applied.section ? `&& (invoice.party.area.section = "${applied.section}")` : ""}`
  });
  
  const areas = useCRUD().fullList({ collection: "areas", expand: "section" });
  const bookers = useCRUD().fullList({ collection: "order_bookers" });
  const items = useCRUD().fullList({ collection: "items", expand: "category" });

  const queries = [transactions, areas, bookers, items];

  if (checkSuccess(queries)) {
    const aggregatedData = aggregateProductData(transactions.data, items.data);
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
                value={form.values.booker}
                onChange={(v) => form.setFieldValue("booker", v)}
                searchable
                clearable
            />
             <Select
                label="Select Area"
                data={areas.data?.map((a) => ({ value: a.id, label: a.name })) || []}
                value={form.values.area}
                onChange={(v) => form.setFieldValue("area", v || "")}
                searchable
                clearable
            />
            <NSelect
                label="Select Section"
                dataQuery={{ collectionName: "sections" }}
                dataQueryValue="id"
                value={form.values.section}
                onChange={(v) => form.setFieldValue("section", v)}
                searchable
                clearable
            />
             {/* POS-0026 — request the data only when Apply is pressed. */}
             <Button onClick={() => apply({ fromDate, toDate, ...form.values })}>APPLY</Button>
             <Button
                variant='default'
                onClick={() => {
                    form.setValues({ booker: initial.booker, area: initial.area, section: initial.section });
                    setFromDate(initial.fromDate);
                    setToDate(initial.toDate);
                    reset();
                }}
             >
                Reset
             </Button>
        </Group>

        <div ref={printRef} style={{ padding: "0.5cm" }}>
          <PrintContent>
            <Text size="xl" fw={700} ta="center" mb="md">Product Supply Summary</Text>
             <Text size="sm" ta="center">
                {moment(applied.fromDate).format("DD MMM YYYY")} - {moment(applied.toDate).format("DD MMM YYYY")}
            </Text>
            
            <Table withTableBorder withColumnBorders striped mt="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product Name</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Quantity (Ctn:Unit)</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {aggregatedData.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.name}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{row.displayQty}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{row.amount.toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr style={{ fontWeight: 'bold' }}>
                    <Table.Td>Total</Table.Td>
                    <Table.Td></Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{aggregatedData.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}</Table.Td>
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

function aggregateProductData(transactions, items) {
  if (!transactions || !items) return [];
  
  const productStats: Record<string, {
      id: string;
      name: string;
      totalUnits: number;
      amount: number;
      packing: number;
      itemObj: any;
  }> = {};
  transactions.forEach((t) => {
      const itemId = t.item;
      const itemObj = items.find(i => i.id === itemId);
      if (!itemObj) return;

      if (!productStats[itemId]) {
          productStats[itemId] = {
              id: itemId,
              name: itemObj.name,
              totalUnits: 0,
              amount: 0,
              packing: itemObj.packing || 1,
              itemObj: itemObj
          };
      }
      
      productStats[itemId].totalUnits += t.qty;
      productStats[itemId].amount += t.total || 0;
  });

  return Object.values(productStats).map(p => {
      return {
          ...p,
          displayQty: qtyDisplay({ box_size_qty: p.itemObj.box_size_qty || 1 }, p.totalUnits)
      };
  }).filter(p => p.totalUnits > 0);
}
