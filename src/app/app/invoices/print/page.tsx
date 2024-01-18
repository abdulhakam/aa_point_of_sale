"use client";
import { DataTableColumn } from "mantine-datatable";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import ReportViewTable from "@/app/components/ReportViewTable";
import dataFilter from "@/app/components/functions/dataFilter";
import { useState } from "react";
import { Box, Button, Flex, Group, Modal, Select, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { qtyDisplay } from "@/app/components/functions/qtyParser";
import NumberAddress from "@/app/components/NumberAddress/NumberAddress";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "created", hidden: true },
  { accessor: "item", width: "10em" },
  { accessor: "qty", width: "5em", render: (record) => qtyDisplay(record.expand.item, record.qty) },
  { accessor: "price", width: "3em" },
  { accessor: "discount_1", title: "D1", width: "2em" },
  { accessor: "discount_2", title: "D2", width: "3em" },
  { accessor: "total", width: "4em" },
];

export default function InvoicePrint() {
  const [opened, { open, close }] = useDisclosure(true);
  const [type, setType] = useState("sale");
  const [filterValue, setFilter] = useState("1");
  const invoices = useCRUD().fullList({
    collection: "invoice_view",
    expand: "invoice_maker,party,booker",
  });
  const transactions = useCRUD().fullList({ collection: "transaction_view", expand: "item" });
  const filteredData = dataFilter([{ key: "invoice", value: filterValue }], transactions.data);
  const filteredInvoices = invoices.data?.filter((inv) => inv.type === type);
  const invoice = invoices.data?.find((inv) => inv.id === filterValue);
  const queries = [invoices, transactions];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal centered opened={opened} onClose={close} title='Filter Data'>
          <Select
            searchable
            allowDeselect={false}
            label={"Invoice Type:"}
            data={["purchase", "sale"]}
            value={type}
            onChange={setType}
          />
          <Select
            searchable
            allowDeselect={false}
            label={"Invoice No:"}
            data={filteredInvoices.map((inv) => ({ value: inv.id, label: String(inv.invoiceNo) }))}
            value={filterValue}
            onChange={setFilter}
          />
          <Button
            mt={"sm"}
            onClick={() => {
              close();
            }}
          >
            OK
          </Button>
        </Modal>
        <NumberAddress/>
        <Flex align={"center"} justify={"space-between"}>
          <Button p={0} onClick={open} variant='transparent' size='lg' fw={"700"} color='black'>
            {`${type.toUpperCase()} INVOICE`}
          </Button>
          <Text size={"xs"}>{`Invoice Date: ${new Date(invoice?.created).toLocaleDateString("en", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}`}</Text>
        </Flex>
        {filterValue !== "" && (
          <>
            {type === "sale" && <Text size={"xs"}>{`BOOKER: ${invoice?.expand?.booker?.name}`}</Text>}
            <Flex justify={"space-between"}>
              <Text size={"xs"}>{`Invoice #: ${invoice?.invoiceNo}`}</Text>
              <Text size={"xs"}>{`Party: ${invoice?.expand.party.name}`}</Text>
              <Text size={"xs"}>{`Invoice Maker: ${invoice?.expand.invoice_maker.name}`}</Text>
            </Flex>
            <hr />
            {invoice?.invoiceNo && (
              <>
                <ReportViewTable columns={tableStructure} data={filteredData} />
                <Flex
                  justify={"end"}
                  align={"center"}
                  mr={"0.5rem"}
                  mt={"-4.5em"}
                  h={"4em"}
                  style={{
                    position: "relative",
                  }}
                >
                  <Stack w={"100%"} justify='end' align='end'>
                    <Group mr={0} w={"100%"} justify='space-between'>
                      {new Date(invoice?.duedate.slice(0, 10)) > new Date(invoice?.created.slice(0, 10)) ? (
                        <Group>
                          {invoice?.description && (
                            <TextInput variant='unstyled' size='xs' value={invoice?.description}></TextInput>
                          )}
                          <Text ml={"1em"} fw={700} size='xs'>
                            Due Date:
                          </Text>
                          <Text size='xs' fw={700}>
                            {`${invoice?.duedate.slice(0, 10)} `}
                          </Text>
                        </Group>
                      ) : (
                        <></>
                      )}
                      <Group>
                        <Text mr={"1em"} size='xs'>
                          Total
                        </Text>
                        <Text size='xs' fw={700}>
                          {invoice?.total || 0}
                        </Text>
                      </Group>
                    </Group>
                    <Group mt={-10}>
                      <Text mr={"1em"} size='xs'>
                        Discount_1
                      </Text>
                      <Text mr={"1em"} size='xs' fw={700}>
                        {invoice?.discount_1 || 0}
                      </Text>
                      <Text mr={"1em"} size='xs'>
                        Discount_2
                      </Text>
                      <Text mr={"1em"} size='xs' fw={700}>
                        {invoice?.discount_2 || 0}
                      </Text>
                      <Text mr={"1em"} size='sm'>
                        Invoice Total
                      </Text>
                      <Text size='md' fw={700}>
                        {invoice?.final_total || 0}
                      </Text>
                    </Group>
                  </Stack>
                </Flex>
              </>
            )}
          </>
        )}
      </>
    );
  } else return <StatusCheck check={queries} />;
}
