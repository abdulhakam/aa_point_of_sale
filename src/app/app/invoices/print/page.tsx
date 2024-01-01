"use client";
import { DataTableColumn } from "mantine-datatable";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import ReportViewTable from "@/app/components/ReportViewTable";
import dataFilter from "@/app/components/functions/dataFilter";
import { useState } from "react";
import { Button, Flex, Group, Modal, Select, Stack, Table, Text, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DatePicker } from "@mantine/dates";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "created", hidden: true },
  { accessor: "item" },
  { accessor: "qty" },
  { accessor: "price" },
  { accessor: "discount_1" },
  { accessor: "discount_2" },
  { accessor: "total" },
];

export default function InvoicePrint() {
  const [opened, { open, close }] = useDisclosure(true);
  const [type, setType] = useState("sale");
  const [filterValue, setFilter] = useState("");
  const invoices = useCRUD().fullList({
    collection: "invoice_view",
    expand: "invoice_maker,party",
  });
  const transactions = useCRUD().fullList({ collection: "transaction_view", expand: "item" });
  const filterKey = "invoice";
  const filteredData = dataFilter([{ key: filterKey, value: filterValue }], transactions.data);
  const invoice = invoices.data?.find((inv) => inv.id === filterValue);
  const queries = [invoices, transactions];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal centered opened={opened} onClose={close} title='Filter Data'>
          <Select
          searchable
            label={"Please Select Invoice:"}
            data={invoices.data.map((inv) => inv.id)}
            value={filterValue}
            onChange={setFilter}
          />
          <Button
            onClick={() => {
              setType(invoices.data.find((inv) => inv.id === filterValue).type);
              close();
            }}
          >
            OK
          </Button>
        </Modal>
        <Button onClick={open} variant='transparent' size='lg' fw={"700"} color='black'>
          {`${type.toUpperCase()} INVOICE`}
        </Button>
        {filterValue !== "" && (
          <>
            <Text>{`Invoice #: ${filterValue}`}</Text>
            <Text>{`Invoice Maker: ${invoice?.expand.invoice_maker.name}`}</Text>
            <Text>{`Party: ${invoice?.expand.party.name}`}</Text>
            <hr />
            <ReportViewTable columns={tableStructure} data={filteredData} />
            <Flex
              justify={"end"}
              align={"center"}
              style={{
                border: "1px solid lightgray",
                position: "relative",
                marginTop: "-4.15rem",
                height: "4rem",
              }}
            >
              <Stack justify="end" align="end">
                <Group mr={0}>
                  <Text mr={"3rem"} size='lg'>
                    Total
                  </Text>
                  <Text mr={"7rem"} size='lg' fw={700}>
                    {invoice.total}
                  </Text>
                </Group> 
                <Group mt={-10}>
                <Text mr={"1rem"} size='md'>
                    Discount_1
                  </Text>
                  <Text mr={"4rem"} size='md' fw={700}>
                    {invoice.discount_1}
                  </Text><Text mr={"1rem"} size='md'>
                    Discount_2
                  </Text>
                  <Text mr={"4rem"} size='md' fw={700}>
                    {invoice.discount_2}
                  </Text>
                  <Text mr={"3rem"} size='xl'>
                    Total After Discount
                  </Text>
                  <Text mr={"7rem"} size='xl' fw={700}>
                    {invoice.final_total}
                  </Text>
                </Group>  
              </Stack>
            </Flex>
          </>
        )}
      </>
    );
  } else return <StatusCheck check={queries} />;
}
