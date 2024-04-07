"use client";
import React from "react";
import { Flex, Group, Stack, Table, Text } from "@mantine/core";
import { getQty } from "@/app/components/functions/qtyParser";
import styles from "@/app/components/printing/styles.module.css";

export default function InvoiceBody({
  transactions,
  invoice,
  breakAfter,
  inline,
}: {
  transactions: any[];
  invoice: any;
  breakAfter?: boolean;
  inline?: boolean;
}) {
  const type = invoice.type;
  const isD1 = transactions.reduce((a, b) => a + b.discount_1, 0) !== 0;
  const isD2 = transactions.reduce((a, b) => a + b.discount_2, 0) !== 0;
  const isDrs = transactions.reduce((a, b) => a + b.discount_rs, 0) !== 0;
  const numDAll = (isD1 ? 1 : 0) + (isD2 ? 1 : 0) + (isDrs ? 1 : 0) ;
  const head = (
    <Table.Thead>
      <Table.Tr>
        <Table.Th scope='col' rowSpan={2}>
          #
        </Table.Th>
        <Table.Th scope='col' rowSpan={2}>
          ITEM
        </Table.Th>
        <Table.Th scope='col' style={{ width: "2em" }} rowSpan={2}>
          BOX SIZE
        </Table.Th>
        <Table.Th scope='col' colSpan={3}>
          QUANTITY
        </Table.Th>
        <Table.Th scope='col' colSpan={2}>
          PRICES
        </Table.Th>
        {numDAll !== 0 && (
          <Table.Th scope='col' colSpan={numDAll}>
            DISCOUNTS
          </Table.Th>
        )}
        <Table.Th scope='col' rowSpan={2}>
          TOTAL
        </Table.Th>
      </Table.Tr>
      <Table.Tr>
        <Table.Th scope='col'>CTN</Table.Th>
        <Table.Th scope='col' style={{ width: "1em" }}>
          UNTS
        </Table.Th>
        <Table.Th scope='col'>FREE</Table.Th>
        <Table.Th scope='col'>UNIT</Table.Th>
        <Table.Th scope='col'>CTN</Table.Th>
        {isD1 && <Table.Th scope='col'>1(%)</Table.Th>}
        {isD2 && <Table.Th scope='col'>2(%)</Table.Th>}
        {isDrs && <Table.Th scope='col'>IN RS</Table.Th>}
      </Table.Tr>
    </Table.Thead>
  );
  const rows = transactions.map((r, i) => (
    <Table.Tr key={`TRow-${i + 1}`}>
      <Table.Td>{i + 1}</Table.Td>
      <Table.Td scope='row' style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
        {r.expand.item.name}
      </Table.Td>
      <Table.Td style={{ textAlign: "end" }}>{r.expand.item.box_size_qty}</Table.Td>
      <Table.Td style={{ textAlign: "end" }}>{getQty(r.expand.item, r.qty).ctns}</Table.Td>
      <Table.Td style={{ textAlign: "end" }}>{getQty(r.expand.item, r.qty).units}</Table.Td>
      <Table.Td style={{ textAlign: "end" }}>{r.scheme}</Table.Td>
      <Table.Td style={{ textAlign: "end" }}>{Number(r.price).toFixed(2)}</Table.Td>
      <Table.Td style={{ textAlign: "end" }}>
        {Number(r.price * r.expand.item.box_size_qty).toFixed(2)}
      </Table.Td>
      {isD1 && <Table.Td style={{ textAlign: "end" }}>{Number(r.discount_1).toFixed(2)}</Table.Td>}
      {isD2 && <Table.Td style={{ textAlign: "end" }}>{Number(r.discount_2).toFixed(2)}</Table.Td>}
      {isDrs && <Table.Td style={{ textAlign: "end" }}>{Number(r.discount_rs).toFixed(2)}</Table.Td>}
      <Table.Td style={{ textAlign: "end" }}>{Number(r.total).toFixed(2)}</Table.Td>
    </Table.Tr>
  ));
  return (
    <>
      {inline && (
        <div
          className={styles.hideOnPrint}
          style={{ border: "1px solid lightgray", borderRadius: 4, margin: "4px", padding: 10 }}
        >
          <Text>{`${invoice.type.charAt(0).toUpperCase()} ${invoice.invoiceNo}`}</Text>
          <Text>{`PARTY: ${invoice?.expand.party?.name}`}</Text>
        </div>
      )}
      <div className={inline && styles.showOnPrint} style={breakAfter ? { breakAfter: "page" } : {}}>
        <h3 style={{ margin: 0 }}>{`${type.toUpperCase()} INVOICE`}</h3>
        <Group gap={0} justify='space-between'>
          <Stack w={"65%"}>
            <Table
              borderColor='gray'
              fz={"10pt"}
              withRowBorders={false}
              horizontalSpacing={"1em"}
              verticalSpacing={0}
              data={{
                body: [
                  [
                    "Party",
                    <>
                      {" "}
                      <b>{invoice?.expand.party?.name}</b> ({invoice?.expand?.party?.phone})
                    </>,
                  ],
                  type === "sale"
                    ? [
                        "Address",
                        `${invoice?.expand?.party?.address ?? ""} - ${
                          invoice?.expand?.party?.expand?.area?.name ?? ""
                        } - ${invoice?.expand?.party?.expand?.area?.expand?.section?.name ?? ""}`,
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
            fz={"10pt"}
            withRowBorders={false}
            verticalSpacing={0}
            horizontalSpacing={"1em"}
            data={{
              body: [
                [
                  <Text key={"invoiceNoLabel"} fw={600}>
                    {"Invoice #:"}
                  </Text>,
                  <Text
                    key={"invoiceNoValue"}
                    fw={"700"}
                    style={{ border: "1px solid black", paddingLeft: "0.5em" }}
                  >{` ${invoice?.invoiceNo}`}</Text>,
                ],
                [
                  "Invoice Date:",
                  ` ${new Date(invoice?.created).toLocaleDateString("en", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`,
                ],
                [
                  "Invoice Time:",
                  ` ${new Date(invoice?.created).toLocaleTimeString("en", {
                    hour: "numeric",
                    minute: "numeric",
                    second: "2-digit",
                    hour12: true,
                  })}`,
                ],
              ],
            }}
          />
        </Group>
        <hr />

        <Table
          styles={{
            td: { fontSize: "xs", padding: "0.2em", border: "1px solid black" },
            th: { fontSize: "8pt", padding: "0.2em", border: "1px solid black", fontWeight: 500 },
          }}
        >
          {head}
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
        <Flex
          justify={"end"}
          align={"center"}
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
              fz={"sm"}
              data={{
                body: [
                  ["TOTAL AMOUNT", <b key={"total-amount-amount"}>{Number(invoice?.total).toFixed(2)}</b>],
                  ["DISCOUNT 1", `${Number(invoice?.discount_1).toFixed(2)}%`],
                  ["DISCOUNT 2", `${Number(invoice?.discount_2).toFixed(2)}%`],
                  ["DISCOUNT cash", `${Number(invoice?.discount_rs).toFixed(2)}`],
                  [
                    "PAYABLE AMOUNT",
                    <b key={"finalamountamount"}>{Number(invoice?.final_total).toFixed(2)}</b>,
                  ],
                ],
              }}
            />
          </Group>
        </Flex>
      </div>
    </>
  );
}
