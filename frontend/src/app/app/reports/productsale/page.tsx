"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
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

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: "@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;",
  });

  const transactions = useCRUD().fullList({
    collection: "transaction_view",
    expand: "item,invoice,invoice.party,invoice.party.area,invoice.party.area.section", 
    filter: `(type = "sale")
            && (created >= '${moment(fromDate).startOf("day").format("YYYY-MM-DD HH:mm:ss")}' 
            && created <= '${moment(toDate).endOf("day").format("YYYY-MM-DD HH:mm:ss")}')
            ${form.values.booker ? `&& (invoice.booker = "${form.values.booker}")` : ""}
            ${form.values.area ? `&& (invoice.party.area = "${form.values.area}")` : ""}
            ${form.values.section ? `&& (invoice.party.area.section = "${form.values.section}")` : ""}`
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
             <Button onClick={() => form.setValues({ booker: "", area: "", section: "" })}>Reset</Button>
        </Group>

        <div ref={printRef} style={{ padding: "0.5cm" }}>
          <PrintContent>
            <Text size="xl" fw={700} ta="center" mb="md">Product Supply Summary</Text>
             <Text size="sm" ta="center">
                {moment(fromDate).format("DD MMM YYYY")} - {moment(toDate).format("DD MMM YYYY")}
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
      console.log(productStats[itemId]);
  });

  return Object.values(productStats).map(p => {
      return {
          ...p,
          displayQty: qtyDisplay({ box_size_qty: p.itemObj.box_size_qty || 1 }, p.totalUnits)
      };
  }).filter(p => p.totalUnits > 0);
}
