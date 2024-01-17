"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Flex, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import dataFilter from "@/app/components/functions/dataFilter";
import NewPayment from "./NewPayment";
import { IconSearch } from "@tabler/icons-react";

export default function PaymentsReport() {
  const [opened, { open, close }] = useDisclosure(false);
  const [party, setParty] = useState("");
  const [paymentType, setPaymentType] = useState("all");
  const payments = useCRUD().fullList({ collection: "payments_view", expand: "invoice", sort: "+created" });
  const invoices = useCRUD().fullList({ collection: "invoices" });
  const parties = useCRUD().fullList({ collection: "parties" });
  const filteredPayments = dataFilter(
    [
      { key: "party", value: party },
      { key: "type", value: paymentType === "all" ? "" : paymentType },
    ],
    payments.data
  );
  const tableStructure: DataTableColumn[] = [
    { accessor: "id", hidden: true },
    { accessor: "created", sortable: true },
    {
      accessor: "type",
      sortable: true,
    },
    {
      accessor: "invoice",
      sortable: true,
      render: (record) => <>{`${record.expand?.invoice?.invoiceNo || ""}`}</>,
    },
    { accessor: "party", sortable: true },
    { accessor: "amount", sortable: true },
    {
      accessor: "paid",
      sortable: true,
      title: "Payment",
      render: (record) => <>{record.paid ? "O" : "X"}</>,
    },
    { accessor: "description", sortable: true },
  ];
  const { total, totalPaid, invoiceTotal } = calculator(
    filteredPayments?.map((pmnt) => ({
      ...pmnt,
      expand: {
        ...pmnt.expand,
        party: { ...parties.data?.find((pty) => pty.id === pmnt.party) },
      },
    }))
  );
  const queries = [payments, invoices, parties];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal centered opened={opened} onClose={close} title='Filter Data'>
          <Select
            label={"Select Party"}
            data={[
              ...parties.data.map((pty) => ({ value: pty.id, label: pty.name })),
              { value: "", label: "All" },
            ]}
            value={party}
            onChange={setParty}
          />
          <Select
            label={"Select Payment Type"}
            data={["sending", "recieving", "all"]}
            value={paymentType}
            onChange={setPaymentType}
          />
          <Button onClick={close}>OK</Button>
        </Modal>
        <Group align="center">
          <Button onClick={open} variant='transparent' m={0} p={0} size='compact-lg' fw={"700"} color='black'>
            {`PAYMENTS REPORT`}
          </Button>
          <NewPayment />
        </Group>
        <Text size={"md"}>{`Party: ${parties.data?.find((pty) => pty.id === party)?.name || "all"}`}</Text>
        <hr />
        <DataViewTable
          report
          fz={"xs"}
          verticalSpacing={0}
          horizontalSpacing={0}
          rowStyle={({ paid, invoice, type }) =>
            invoice
              ? null
              : type === "recieving"
              ? paid
                ? { color: "green" }
                : { color: "red" }
              : paid
              ? { color: "red" }
              : { color: "green" }
          }
          formstructure={{}}
          columns={tableStructure}
          data={filteredPayments?.map((pmnt) => ({
            ...pmnt,
            expand: { ...pmnt.expand, party: { ...parties.data?.find((pty) => pty.id === pmnt.party) } },
          }))}
        />
        <Flex
          justify={"end"}
          align={"center"}
          mt={"-4.15em"}
          mr={"1rem"}
          h={"3rem"}
          style={{
            position: "relative",
          }}
        >
          <Stack justify='end' align='end'>
            <Group mr={0}>
              <Text mr={"1em"} size='xs'>
                Invoice Total
              </Text>
              <Text size='xs' fw={700}>
                {invoiceTotal}
              </Text>
              <Text mr={"1em"} size='xs'>
                Paid Total
              </Text>
              <Text size='xs' fw={700}>
                {totalPaid}
              </Text>

              <Text mr={"1em"}>Total</Text>
              <Text fw={700}>{total}</Text>
            </Group>
          </Stack>
        </Flex>
      </>
    );
  } else return <StatusCheck check={queries} />;
}

function calculator(payments) {
  let invoiceTotal = 0;
  let paid = 0;
  for (const pmnt of payments) {
    pmnt.paid ? (paid += pmnt.amount) : (invoiceTotal += pmnt.amount);
  }

  const total = Number((invoiceTotal - paid).toFixed(2));
  return { total, invoiceTotal, totalPaid: paid };
}
//TODO: CALCULATE TOTAL PAYMENTS TO RECIEVE TO PAY AND TOTALS
