"use client";
import { ActionIcon, Button, Group, Select, Text } from "@mantine/core";
import PaymentsReport from "./PaymentsView";
import { IconPrinter } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import PrintContent from "@/app/components/printing/PrintContent";
import moment from "moment";
import { DateInput } from "@mantine/dates";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import useCRUD from "@/app/api/useAPI";
import { NSelect } from "@/app/components/BetterComps/Select";
import styles from "@/app/components/printing/styles.module.css";
import { useForm } from "@mantine/form";

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
      booker: "" as any,
      area: "" as any,
      section: "" as any,
      party: "",
      paymentType: "" as any,
      invoiceFilter: "",
      company: "" as any,
    },
  });

  const payments = useCRUD().fullList({
    collection: "payments_view",
    expand: "invoice,party,area,section,booker",
    filter: `(created >= '${moment(fromDate).startOf("day").format("YYYY-MM-DD HH:mm:ss")}' 
      && created <= '${moment(toDate).utc().endOf("day").format("YYYY-MM-DD HH:mm:ss")}')
      ${form.values.booker ? `&& (booker = "${form.values.booker}")` : ""}
      ${form.values.area ? `&& (area = "${form.values.area}")` : ""}
      ${form.values.section ? `&& (section = "${form.values.section}")` : ""}
      ${form.values.party ? `&& (party = "${form.values.party}")` : ""}
      ${form.values.paymentType ? `&& (type = "${form.values.paymentType}")` : ""}
      ${
        form.values.invoiceFilter
          ? `&& ( original_invoices ~ "${form.values.invoiceFilter}" || invoice = "${form.values.invoiceFilter}")`
          : ""
      }
      `,
  });
  const parties = useCRUD().fullList({ collection: "parties", expand: "area,area.section" });
  const areas = useCRUD().fullList({ collection: "areas", expand: "section" });
  const sections = useCRUD().fullList({ collection: "sections" });
  const bookers = useCRUD().fullList({ collection: "order_bookers" });
  const invoices = useCRUD().fullList({ collection: "invoices", sort: "+id" });

  const queries = [payments, areas, sections, bookers, parties, invoices];

  if (checkSuccess(queries)) {
    const party = parties.data.find((parties) => form.values.party === parties.id)?.name;
    const area = areas.data.find((areas) => form.values.area === areas.id)?.name;
    const section = sections.data.find((sections) => form.values.section === sections.id)?.name;
    const booker = bookers.data.find((bookers) => form.values.booker === bookers.id)?.name;
    const invoice =
      invoices.data.find((invoices) => form.values.invoiceFilter === invoices.id)?.invoiceNo;
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
          <Select
            label={"Select Area"}
            data={
              form.values.section === ""
                ? [...areas?.data?.map((ara) => ({ value: ara.id, label: ara.name }))]
                : [
                    ...areas?.data
                      ?.filter((ara) => ara.expand?.section?.id === form.values.section)
                      .map((itm) => ({ label: itm.name, value: itm.id })),
                  ]
            }
            value={form.values.area}
            searchable
            onChange={(v) => {
              form.setFieldValue("area", v);
              form.setFieldValue("reportType", "area");
            }}
          />
          <NSelect
            allowDeselect={false}
            label={"Select Section"}
            dataQuery={{ collectionName: "sections" }}
            dataQueryValue='id'
            dataLabel='name'
            value={form.values.section}
            searchable
            onChange={(v) => {
              form.setFieldValue("section", v);
              form.setFieldValue("reportType", "section");
            }}
          />

          <NSelect
            label={"Select Booker"}
            data={[]}
            dataQuery={{ collectionName: "order_bookers" }}
            dataQueryValue='id'
            value={form.values.booker}
            searchable
            onChange={(v) => {
              form.setFieldValue("booker", v);
              form.setFieldValue("reportType", "booker");
            }}
          />

          <Select
            label={"Select Party"}
            data={[
              ...parties.data.map((pty) => ({
                value: pty.id,
                label: `${pty.name} - ${pty.expand?.area?.name}`,
              })),
            ]}
            value={form.values.party}
            searchable
            onChange={(v) => {
              form.setFieldValue("party", v);
              form.setFieldValue("reportType", "party");
            }}
          />
          <Select
            label={"Select Payment Type"}
            data={[
              { label: "Purchase", value: "sending" },
              { label: "Sale", value: "recieving" },
              { label: "Returns", value: "return" },
            ]}
            value={form.values.reportType}
            onChange={(v) => {
              form.setFieldValue("paymentType", v);
              form.setFieldValue("reportType", v);
            }}
          />
          <Select
            label={"Invoice"}
            searchable
            value={form.values.invoiceFilter}
            onChange={(v) => {
              form.setFieldValue("invoiceFilter", v);
              form.setFieldValue("reportType", "invoice");
            }}
            data={invoices.data?.map((inv) => ({
              value: inv.id,
              label: `${inv.invoiceNo} ${inv.type.toUpperCase().charAt(0)}`,
            }))}
          />
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
            <Text size="xl" fw={700}>
              Payments Report
            </Text>
            <PaymentsReport
              fromDate={fromDate}
              toDate={toDate}
              payments={payments.data}
              area={area}
              section={section}
              booker={booker}
              party={party}
              invoice={invoice}
            />
          </PrintContent>
        </div>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
