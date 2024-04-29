"use client";
import { Flex, Group, Table, Text } from "@mantine/core";

export default function CRVReport({
  fromDate,
  toDate,
  payments = [] as any[],
}) {
  const tableStructure = [
    { accessor: "id", hidden: true },
    {
      accessor: "created",
      title: "Date",
      render: (record) => <>{record.created.slice(0, 10)}</>,
      sortable: true,
      width: "6em",
    },
    {
      accessor: "type",
      sortable: true,
      width: "9em",
      render: (record) =>
        record.type === "sending" ? (
          record.description === "payment" ? (
            <>{"Purchase Payment"}</>
          ) : (
            <>{"Purchase"}</>
          )
        ) : record.type === "recieving" ? (
          record.description === "payment" ? (
            <>{"Sale Payment"}</>
          ) : (
            <>{"Sale"}</>
          )
        ) : (
          <>{"Return"}</>
        ),
    },
    {
      accessor: "invoice",
      sortable: true,
      width: "4em",
      render: (record) => <>{`${record.expand?.invoice?.invoiceNo || ""}`}</>,
    },
    { accessor: "party", sortable: true },
    {
      accessor: "amount",
      textAlign: "right" as any,
      render: (record) => <>{`${record.amount != null ? record.amount.toFixed(2) : -0}`}</>,
    },
    { accessor: "description", hidden: true, sortable: true },
  ];

  const {
    total,
    totalPaid,
    invoiceTotal,
    totalSending,
    totalRecieving,
    recieving,
    recieved,
    sending,
    sent,
    sendingReturns,
    recievingReturns,
  } = calculator(payments);

  return (
    <>
      <Group align='center' justify='space-between'>
        <Group justify='end'>
          <Text size={"sm"}>{`DATE FROM: ${
            fromDate !== null
              ? fromDate.toLocaleDateString("en", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "-"
          }`}</Text>
          <Text size={"sm"}>{`DATE TO: ${
            toDate !== null
              ? toDate.toLocaleDateString("en", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "-"
          }`}</Text>
        </Group>
      </Group>
      <Group justify='start' gap={"4rem"}>
        {""}
      </Group>
      <Table
        fz={"sm"}
        horizontalSpacing={1}
        verticalSpacing={0}
        styles={{
          td: { padding: "0.2em", border: "1px solid black" },
          th: { padding: "0.2em", border: "1px solid black" },
        }}
      >
        <Table.Thead>
          <Table.Tr>
            {tableStructure.map((col) =>
              col.hidden ? null : (
                <Table.Td key={`thead-${col.accessor}`}>{(col.title ?? col.accessor).toUpperCase()}</Table.Td>
              )
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {payments.map((row) => (
            <Table.Tr key={`row-${row.id}`}>
              {tableStructure.map((col) =>
                col.hidden ? null : (
                  <Table.Td
                    key={`td-${row.id}-${col.accessor}`}
                    style={{ textAlign: col.textAlign ?? "start", width: col.width ?? "auto" }}
                  >
                    {col.render
                      ? col.render(row)
                      : row.hasOwnProperty("expand")
                      ? row.expand.hasOwnProperty(col.accessor)
                        ? row.expand[col.accessor].name || row.expand[col.accessor].value
                        : row[col.accessor]
                      : row[col.accessor]}
                  </Table.Td>
                )
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Flex gap={"md"} direction={"row"} justify={"end"} align={"end"} w={"100%"}>
        <Table
          w={"15rem"}
          fz={"sm"}
          horizontalSpacing={1}
          verticalSpacing={0}
          data={{
            body: [
              [
                <Text key={"total"} style={{ fontWeight: "bold" }}>Total</Text>,
                <Text style={{ textAlign: "right" }} key={"recamount"}>
                  {-total}
                </Text>,
              ],
            ],
          }}
        />
      </Flex>
    </>
  );
}
function calculator(payments) {
  let invoiceTotal = 0;
  let recieving = 0;
  let recieved = 0;
  let sending = 0;
  let sent = 0;
  let totalPaid = 0;
  let sendingReturns = 0;
  let recievingReturns = 0;
  for (const pmnt of payments) {
    if (pmnt.type === "sending") {
      pmnt.paid ? (sent += pmnt.amount) : (sending += pmnt.amount);
    } else if (pmnt.type === "recieving") {
      pmnt.paid ? (recieved += pmnt.amount) : (recieving += pmnt.amount);
    } else {
      if (pmnt.expand?.party.type === "customer") {
        recievingReturns += pmnt.amount;
      } else {
        sendingReturns += pmnt.amount;
      }
    }
  }

  for (const pmnt of payments) {
    pmnt.paid ? (totalPaid += pmnt.amount) : (invoiceTotal += pmnt.amount);
  }
  const totalSending = Number((sending - sent - sendingReturns).toFixed(2));
  const totalRecieving = Number((recieving - recieved - recievingReturns).toFixed(2));
  const total = Number((invoiceTotal - totalPaid).toFixed(2));
  return {
    total,
    totalSending,
    totalRecieving,
    sendingReturns: Number(sendingReturns).toFixed(2),
    recievingReturns: Number(recievingReturns).toFixed(2),
    invoiceTotal: Number(invoiceTotal).toFixed(2),
    totalPaid: Number(totalPaid).toFixed(2),
    recieving: Number(recieving).toFixed(2),
    recieved: Number(recieved).toFixed(2),
    sending: Number(sending).toFixed(2),
    sent: Number(sent).toFixed(2),
  };
}
