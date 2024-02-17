"use client";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import ReportViewTable from "@/app/components/ReportViewTable";
import dataFilter from "@/app/components/functions/dataFilter";
import { useEffect, useRef, useState } from "react";
import { ActionIcon, Button, Flex, Group, Modal, Select, Stack, Table, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getQty, qtyDisplay } from "@/app/components/functions/qtyParser";
import { IconPrinter } from "@tabler/icons-react";
import { useReactToPrint } from "react-to-print";
import PrintHead from "@/app/components/printing/PrintHead";
import { useSearchParams } from "next/navigation";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "created", hidden: true },
  { accessor: "item", width: "8em" },
  {
    accessor: "box_size_qty",
    title: "Ctn Size",
    width: "3em",
    textAlign: "right",
    render: (record) => record.expand.item.box_size_qty,
  },
  {
    accessor: "ctn",
    width: "2em",
    textAlign: "right",
    render: (record) => getQty(record.expand.item, record.qty).ctns,
  },
  {
    accessor: "units",
    width: "2em",
    textAlign: "right",
    render: (record) => getQty(record.expand.item, record.qty).units,
  },
  { accessor: "scheme", title: "Free (units)", textAlign: "right", width: "3em" },
  { accessor: "price", title: "Unit Price", textAlign: "right", width: "3em" },
  {
    accessor: "ctn price",
    width: "3em",
    textAlign: "right",
    render: (record) => record.price * record.expand.item.box_size_qty,
  },
  { accessor: "discount_1", title: "D1", textAlign: "right", width: "2em" },
  { accessor: "discount_2", title: "D2", textAlign: "right", width: "3em" },
  { accessor: "total", width: "4em", textAlign: "right", render: ({ total }) => Number(total).toFixed(2) },
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
    expand: "invoice_maker,party,booker,party.area,party.area.section",
  });
  const transactions = useCRUD().fullList({
    collection: "transaction_view",
    expand: "item",
    sort: "+created",
  });

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
    transactions.data ? transactions.data : []
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
        <Modal
          centered
          opened={opened}
          onClose={close}
          title={thisInvoice ? "Click to Print Invoice" : "Filter Data"}
        >
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
            <Button p={0} variant='transparent' size='lg' fw={"700"} color='black'>
              {`${type.toUpperCase()} INVOICE`}
            </Button>
          </Flex>
          {filterValue !== "" && (
            <>
              <Group gap={0} justify='space-between'>
                <Stack w={"65%"}>
                  <Table
                    borderColor='gray'
                    fz={"8pt"}
                    withRowBorders={false}
                    horizontalSpacing={"1em"}
                    verticalSpacing={0}
                    data={{
                      body: [
                        ["Prepared By", invoice?.expand.invoice_maker.name],
                        ["Party", `${invoice?.expand.party.name} (${invoice?.expand?.party?.phone})`],
                        type === "sale"
                          ? [
                              "Address",
                              `${invoice?.expand?.party?.address} - ${invoice?.expand?.party?.expand?.area?.name} - ${invoice?.expand?.party?.expand?.area?.expand?.section?.name}`,
                            ]
                          : [],
                        type === "sale"
                          ? ["Booker", `${invoice?.expand?.booker?.name} (${invoice?.expand?.booker?.phone})`]
                          : [],
                        ["Remarks", invoice?.description],
                      ],
                    }}
                  />
                </Stack>
                <Table
                  w={"35%"}
                  fz={"8pt"}
                  withRowBorders={false}
                  verticalSpacing={0}
                  horizontalSpacing={"1em"}
                >
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
              </Group>
              <hr />
              {invoice?.invoiceNo && (
                <>
                  <ReportViewTable fz={"7pt"} columns={tableStructure} data={filteredData} />
                  <Flex
                    justify={"end"}
                    align={"center"}
                    // px={"0.5rem"}
                    // h={"4em"}
                    style={{
                      border: "1px solid black",
                    }}
                  >
                    <Group mr={0} w={"60%"} justify='space-between'>
                      {new Date(invoice?.duedate.slice(0, 10)) >
                      new Date(invoice?.date ? invoice?.date.slice(0, 10) : invoice?.created.slice(0, 10)) ? (
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
                    </Group>
                    <Group gap={0}>
                      <Table
                        horizontalSpacing={2}
                        verticalSpacing={0}
                        fz={"7pt"}
                        data={{
                          body: [
                            ["TOTAL AMOUNT", Number(invoice?.total).toFixed(2)],
                            ["DISCOUNT 1", `${Number(invoice?.discount_1).toFixed(2)}%`],
                            ["DISCOUNT 2", `${Number(invoice?.discount_2).toFixed(2)}%`],
                            ["PAYABLE AMOUNT", Number(invoice?.final_total).toFixed(2)],
                          ],
                        }}
                      />
                      {/* <Group>
                          <Text mr={"1em"} size='xs'>
                            Total
                          </Text>
                          <Text size='xs' fw={700}>
                            {Number(invoice?.total).toFixed(2) || 0}
                          </Text>
                        </Group>
                        <Group>
                          <Text mr={"1em"} size='xs'>
                            Discount_1
                          </Text>
                          <Text mr={"1em"} size='xs' fw={700}>
                            {`${invoice?.discount_1 || 0}%`}
                          </Text>
                        </Group>
                        <Group>
                          <Text mr={"1em"} size='xs'>
                            Discount_2
                          </Text>
                          <Text mr={"1em"} size='xs' fw={700}>
                            {invoice?.discount_2 || 0}
                          </Text>
                        </Group>
                        <Group>
                          <Text mr={"1em"} size='sm'>
                            Invoice Total
                          </Text>
                          <Text size='md' fw={700}>
                            {Number(invoice?.final_total).toFixed(2) || 0}
                          </Text>
                        </Group> */}
                    </Group>
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
