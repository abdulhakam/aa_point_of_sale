"use client";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import ReportViewTable from "@/app/components/ReportViewTable";
import dataFilter from "@/app/components/functions/dataFilter";
import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getQty, qtyDisplay } from "@/app/components/functions/qtyParser";
import { IconPrinter } from "@tabler/icons-react";
import { useReactToPrint } from "react-to-print";
import PrintHead from "@/app/components/printing/PrintHead";
import { useSearchParams } from "next/navigation";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "created", hidden: true },
  { accessor: "item", width: "10em" },
  // { accessor: "qty", width: "5em", render: (record) => qtyDisplay(record.expand.item, record.qty) },
  { accessor: "ctn", width: "3em", render: (record) => getQty(record.expand.item, record.qty).ctns },
  { accessor: "units", width: "3em", render: (record) => getQty(record.expand.item, record.qty).units },
  { accessor: "scheme", title: "Free (units)", width: "3em" },
  { accessor: "price", width: "3em" },
  { accessor: "discount_1", title: "D1", width: "2em" },
  { accessor: "discount_2", title: "D2", width: "3em" },
  { accessor: "total", width: "4em" },
];

export default function InvoicePrint() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");

  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });
  const invoices = useCRUD().fullList({
    collection: "invoice_view",
    expand: "invoice_maker,party,booker",
  });
  const transactions = useCRUD().fullList({ collection: "transaction_view", expand: "item" });

  const thisInvoice = invoices.data?.find((inv) => inv.id === invoiceId);
  const [opened, { open, close }] = useDisclosure(true);
  const [type, setType] = useState("purchase");
  const [filterValue, setFilter] = useState("");
  useEffect(() => {
    if (thisInvoice) {
      setFilter(thisInvoice?.id);
      setType(thisInvoice?.type);
    }
  }, [thisInvoice]);
  const filteredInvoices = dataFilter(
    [
      {
        key: "type",
        value: type,
      },
    ],
    invoices.data
  );
  const filteredData = dataFilter(
    [
      {
        key: "invoice",
        value: filterValue,
      },
    ],
    transactions.data
  );
  const invoice = invoices.data?.find((inv) => inv.id === filterValue);
  const queries = [invoices, transactions];
  if (checkSuccess(queries)) {
    return (
      <>
        <ActionIcon
          onClick={() => {
            handlePrint();
          }}
          size='xl'
          variant='subtle'
          color='blue'
        >
          <IconPrinter />
        </ActionIcon>
        <Modal centered opened={opened} onClose={close} title={thisInvoice?"Click to Print Invoice":'Filter Data'}>
          {thisInvoice ? (
            <ActionIcon
              onClick={() => {
                handlePrint();
              }}
              size='xl'
              color='blue'
            >
              <IconPrinter />
            </ActionIcon>
          ) : (
            <>
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
            </>
          )}
        </Modal>
        {/* //////////////////////////////////////////////////////////////////////////// */}
        <div ref={printRef} style={{ marginLeft: "1em", marginRight: "1em" }}>
          <PrintHead />
          <Flex align={"center"} justify={"space-between"}>
            <Button p={0} onClick={open} variant='transparent' size='lg' fw={"700"} color='black'>
              {`${type.toUpperCase()} INVOICE`}
            </Button>
            <Table w={"40%"} fz={"xs"} withRowBorders={false} verticalSpacing={0} horizontalSpacing={"1em"}>
              <Table.Tr>
                <Table.Td>
                  <Text fw={600}>{"Invoice #:"}</Text>
                </Table.Td>
                <Table.Td>
                  <Text
                    fw={"700"}
                    style={{ border: "1px solid black", paddingLeft: "0.5em" }}
                  >{` ${invoice?.invoiceNo}`}</Text>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>{"Invoice Date:"}</Table.Td>
                <Table.Td>{` ${new Date(invoice?.created).toLocaleDateString("en", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>{"Invoice Time:"}</Table.Td>
                <Table.Td>{` ${new Date(invoice?.created).toLocaleTimeString("en", {
                  hour: "numeric",
                  minute: "numeric",
                  second: "2-digit",
                  hour12: true,
                })}`}</Table.Td>
              </Table.Tr>
            </Table>
          </Flex>
          {filterValue !== "" && (
            <>
              <Stack gap={0} justify={"space-between"}>
                <Table
                  borderColor='gray'
                  fz={"xs"}
                  withRowBorders={false}
                  horizontalSpacing={0}
                  verticalSpacing={0}
                  data={{
                    body: [
                      ["Prepared By", invoice?.expand.invoice_maker.name],
                      ["Party", `${invoice?.expand.party.name} (${invoice?.expand?.party?.phone})`],
                      type === "sale" ? ["Address", invoice?.expand?.party?.address] : [],
                      type === "sale"
                        ? ["Booker", `${invoice?.expand?.booker?.name} (${invoice?.expand?.booker?.phone})`]
                        : [],
                      ["Remarks", invoice?.description],
                    ],
                  }}
                />
              </Stack>
              <hr />
              {invoice?.invoiceNo && (
                <>
                  <ReportViewTable columns={tableStructure} data={filteredData} />
                  <Flex
                    justify={"end"}
                    align={"center"}
                    px={"0.5rem"}
                    h={"4em"}
                    style={{
                      position: "relative",
                      border: "1px solid black",
                    }}
                  >
                    <Stack w={"100%"} justify='end' align='end'>
                      <Group mr={0} w={"100%"} justify='space-between'>
                        {new Date(invoice?.duedate.slice(0, 10)) > new Date(invoice?.created.slice(0, 10)) ? (
                          <Group align='center' gap={"1em"}>
                            <Text ml={"1em"} fw={700} size='xs'>
                              Due Date:
                            </Text>
                            <Text size='xs' fw={700}>
                              {`${invoice?.duedate.slice(0, 10)} `}
                            </Text>
                          </Group>
                        ) : (
                          <div> </div>
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
                          {Number(invoice?.final_total).toFixed(2) || 0}
                        </Text>
                      </Group>
                    </Stack>
                  </Flex>
                </>
              )}
            </>
          )}
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
