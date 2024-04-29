"use client";
import { ActionIcon, Button, Checkbox, Group, Select, Text } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import PrintContent from "@/app/components/printing/PrintContent";
import moment from "moment";
import { DateInput } from "@mantine/dates";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import styles from "@/app/components/printing/styles.module.css";
import { useForm } from "@mantine/form";
import PurchasesReport from "./purchasesReport";

export default function Payments() {
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Payment Report",
    pageStyle: `@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;`,
  });

  const [fromDate, setFromDate] = useState<Date | null>(moment().utc().startOf("month").toDate());
  const [toDate, setToDate] = useState<Date | null>(moment().utc().endOf("day").toDate());

  const form = useForm({
    initialValues: {
      reportType: "",
    },
  });

  const [withPayments, setWithPayments] = useState(false);

  const payments = useCRUD().fullList({
    collection: "payments_view",
    expand: "invoice,party,area,section,booker",
    filter: `(created >= '${moment(fromDate).startOf("day").format("YYYY-MM-DD HH:mm:ss")}' 
      && created <= '${moment(toDate).utc().endOf("day").format("YYYY-MM-DD HH:mm:ss")}')
      && (type = "sending") ${withPayments ? "" : "&& (paid = false)"}
      `,
  });

  const queries = [payments];

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
        <Group>
          <DateInput
            value={fromDate}
            onChange={(v) => setFromDate(moment(v).startOf("day").utc().toDate())}
            label='Date From'
          />
          <DateInput
            value={toDate}
            onChange={(v) => setToDate(moment(v).endOf("day").utc().toDate())}
            label='Date To'
          />
        </Group>
        <Group className={styles.hideOnPrint}>
          <Checkbox label='With Payments' checked={withPayments} onChange={(event) => setWithPayments(event.currentTarget.checked)} />
          <Button
            onClick={() => {
              form.reset();
            }}
          >
            RESET
          </Button>
        </Group>
        <div style={{ marginLeft: "1em", marginRight: "1em" }} ref={printRef}>
          <PrintContent>
            <Text size='xl' fw={700}>
              PURCHASES REPORT
            </Text>
            <PurchasesReport fromDate={fromDate} toDate={toDate} payments={payments.data} />
          </PrintContent>
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
