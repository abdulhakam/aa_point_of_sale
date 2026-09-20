"use client";
import { useEffect, useState } from "react";
import { modals } from "@mantine/modals";
import {
  Badge,
  Button,
  Flex,
  Group,
  Select,
  Stack,
  Text,
  Box,
  ActionIcon,
  Modal,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import useCRUD, { crud, useHydratedRefs, useAppliedFilters } from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { IconEye, IconEdit, IconTrash } from "@tabler/icons-react";
import styles from "@/app/components/printing/styles.module.css";
import { DateInput, DatePicker } from "@mantine/dates";
import { NSelect } from "@/app/components/BetterComps/Select";
import moment from "moment";
import { useForm } from "@mantine/form";
import { DataTable } from "mantine-datatable";
import classes from "@/app/components/tableclasses.module.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import EditPayment from "./EditPayment";
import React from "react";

export default function PaymentsView() {
  const [fromDate, setFromDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)
  );
  const [toDate, setToDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59, 999)
  );

  const form = useForm({
    initialValues: {
      reportType: "",
      booker: "",
      area: "",
      section: "",
      party: "",
      paymentType: "",
      invoiceFilter: "",
      company: "",
    },
  });
  const queryClient = useQueryClient();

  // POS-0015 — server-side pagination for this transactional list. Totals come from the
  // `payments_summary` view when every active filter is one of its columns. The Company
  // and Invoice filters are NOT in that view, so for those (rarer) cases we fall back to
  // the previous full-list behaviour, computing totals client-side as before.
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  // POS-0026 — the report query reads this APPLIED snapshot, so changing the inputs above does
  // not fire a request until the user presses Apply. Reset restores the inputs and it together.
  const { applied, apply, reset, initial } = useAppliedFilters({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0),
    toDate: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
      23,
      59,
      59,
      999
    ),
    reportType: "",
    booker: "",
    area: "",
    section: "",
    party: "",
    paymentType: "",
    invoiceFilter: "",
    company: "",
  });

  const summaryCompatible = !applied.company && !applied.invoiceFilter;

  const paymentsFilter = `(created >= '${moment(applied.fromDate)
    .add(1, "day")
    .utc()
    .startOf("day")
    .format("YYYY-MM-DD HH:mm:ss")}' 
    && created <= '${moment(applied.toDate).utc().endOf("day").format("YYYY-MM-DD HH:mm:ss")}')
    ${applied.company ? `&& (company~"${applied.company}")` : ""}
    ${applied.booker ? `&& (booker = "${applied.booker}")` : ""}
    ${applied.area ? `&& (area = "${applied.area}")` : ""}
    ${applied.section ? `&& (section = "${applied.section}")` : ""}
    ${applied.party ? `&& (party = "${applied.party}")` : ""}
    ${applied.paymentType ? `&& (type = "${applied.paymentType}")` : ""}
    ${
      applied.invoiceFilter
        ? `&& ( original_invoices ~ "${applied.invoiceFilter}" || invoice = "${applied.invoiceFilter}")`
        : ""
    }
    `;

  // payments_summary groups by `day` (created truncated to 10 chars), so timestamp date
  // bounds translate to whole days; every other predicate maps 1:1.
  const summaryFilter = `(day >= '${moment(applied.fromDate).add(1, "day").utc().startOf("day").format("YYYY-MM-DD")}'
    && day <= '${moment(applied.toDate).utc().endOf("day").format("YYYY-MM-DD")}')
    ${applied.booker ? `&& (booker = "${applied.booker}")` : ""}
    ${applied.area ? `&& (area = "${applied.area}")` : ""}
    ${applied.section ? `&& (section = "${applied.section}")` : ""}
    ${applied.party ? `&& (party = "${applied.party}")` : ""}
    ${applied.paymentType ? `&& (type = "${applied.paymentType}")` : ""}
    `;

  const paged = useCRUD().pagedList({
    collection: "payments_view",
    page: page,
    perPage: PER_PAGE,
    filter: paymentsFilter,
    enabled: summaryCompatible,
  });
  const summary = useCRUD().fullList({
    collection: "payments_summary",
    filter: summaryFilter,
    // payments_summary has no `created` column, so the default sort would be rejected (400).
    sort: "day",
    enabled: summaryCompatible,
  });
  const fullPayments = useCRUD().fullList({
    collection: "payments_view",
    filter: paymentsFilter,
    enabled: !summaryCompatible,
  });

  // Return to the first page whenever the filter changes.
  useEffect(() => {
    setPage(1);
  }, [paymentsFilter, summaryCompatible]);

  const parties = useCRUD().fullList({ collection: "parties", expand: "area,area.section" });
  const areas = useCRUD().fullList({ collection: "areas", expand: "section" });
  const sections = useCRUD().fullList({ collection: "sections" });
  const bookers = useCRUD().fullList({ collection: "order_bookers" });
  const invoices = useCRUD().fullList({ collection: "invoices", sort: "+id" });

  // POS-0015 — resolve party/area/section/booker/invoice/company names from cached
  // reference collections instead of a per-row server expand over ~26k payments.
  const { data: rows, queries: refQueries } = useHydratedRefs(
    summaryCompatible ? paged.records : fullPayments.data,
    ["invoice", "party", "area", "section", "booker", "company"]
  );
  const [recordData, setRecordData] = useState("");
  const deleteRecord = useMutation({
    mutationFn: crud.remove,
    onSuccess: () => {
      notifications.show({
        title: "Success!",
        color: "green",
        message: "Payment Deleted",
      });
      queryClient.invalidateQueries();
    },
  });
  const tableStructure = [
    { accessor: "id", hidden: true },
    {
      accessor: "payment_date",
      title: "Date",
      render: (record) => <>{record.payment_date.slice(0, 10)}</>,
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
    {
      accessor: "original_invoices",
      sortable: true,
      width: "4em",
      render: (record) => (
        <>{`${
          record.original_invoices
            ? invoices.data.find((inv) => inv.id === record.original_invoices)?.invoiceNo ?? ""
            : "" || ""
        }`}</>
      ),
    },
    {
      accessor: "area",
      sortable: true,
      width: "9em",
    },
    {
      accessor: "section",
      sortable: true,
      width: "9em",
    },

    {
      accessor: "company",
      hidden: true,
      width: "14em",
      sortable: true,
      render: (record) =>
        record.expand?.company?.name ||
        record.expand?.company?.map((cmp, i) => (
          <Badge size='6pt' variant='white' color='black' key={`company-name-badge-${i}-${cmp.id}`}>
            {cmp.name}
          </Badge>
        )),
    },
    { accessor: "party", sortable: true },
    { accessor: "booker", hidden: applied.reportType === "Sending", sortable: true },
    {
      accessor: "amount",
      textAlign: "right" ,
      render: (record) => <>{`${record.amount != null ? record.amount.toFixed(2) : -0}`}</>,
    },
    {
      accessor: "actions",
      title: <Box mr={6}>Row actions</Box>,
      textAlign: "right",
      width: "5.5rem",
      render: (data) => (
        <Group gap={4} justify='right' wrap='nowrap'>
          <ActionIcon
            size='sm'
            variant='subtle'
            color='green'
            onClick={() => showModal({ data, action: "view" })}
          >
            <IconEye size={16} />
          </ActionIcon>
          <ActionIcon
            disabled={data.description !== "payment"}
            size='sm'
            variant='subtle'
            color='blue'
            onClick={() => showModal({ data, action: "edit" })}
          >
            <IconEdit size={16} />
          </ActionIcon>
          {
            <ActionIcon
              disabled={data.description !== "payment"}
              size='sm'
              variant='subtle'
              color='red'
              onClick={() => showModal({ data, action: "delete" })}
            >
              <IconTrash size={16} />
            </ActionIcon>
          }
        </Group>
      ),
    },
    { accessor: "description", hidden: true, sortable: true },
  ];
  const [opened, { open, close }] = useDisclosure(false);
  const showModal = ({ data, action = "view" }) => {
    if (action === "view") {
      modals.open({
        title: "Payment Details",
        children: (
          <div>
            {/* <TextInput label='ID' value={rowDataForm.values.id} readOnly variant="unstyled" /> */}
            <DateInput label='Payment Date' value={new Date(data.payment_date)} readOnly variant='unstyled' />
            <TextInput label='Type' value={data.type} readOnly variant='unstyled' />
            <Group>
              <TextInput label='Party' value={data.expand?.party?.name} readOnly variant='unstyled' />
              <TextInput label='Party Type' value={data.expand?.party?.type} readOnly variant='unstyled' />
            </Group>
            <Group>
              <TextInput label='Area' value={data.expand?.area?.name} readOnly variant='unstyled' />
              <TextInput label='Section' value={data.expand?.section?.name} readOnly variant='unstyled' />
            </Group>
            <Group>
              {/* <TextInput label='Invoice' value={rowDataForm.values.invoice} readOnly variant="unstyled" /> */}
              <TextInput
                label='Invoice No'
                value={data.expand?.invoice?.invoiceNo}
                readOnly
                variant='unstyled'
              />
              {data.type === "return" && (
                <TextInput
                  label='Original Invoice'
                  value={
                    data.original_invoices
                      ? `${
                          invoices.data.find((inv) => inv.id === data.original_invoices[0])?.invoiceNo
                        } ${invoices.data
                          .find((inv) => inv.id === data.original_invoices[0])
                          ?.type?.substring(0, 1)
                          .toUpperCase()}`
                      : ""
                  }
                  readOnly
                  variant='unstyled'
                />
              )}
            </Group>
            <TextInput label='Amount' value={data.amount} readOnly variant='unstyled' />
            {/* <TextInput label='Invoice Maker' value={rowDataForm.values.invoice_maker} readOnly variant="unstyled" /> */}
            <Group>
              <TextInput label='Booker' value={data.expand?.booker?.name} readOnly variant='unstyled' />
              <Text>Company</Text>
              <Stack gap={1}>
                {data.expand?.company.map((cmp) => (
                  <Badge variant={"outline"} color={"black"} key={cmp.id}>
                    {cmp.name}
                  </Badge>
                ))}
              </Stack>
            </Group>
            <TextInput label='Description' value={data.description} readOnly variant='unstyled' />
          </div>
        ),
      });
    } else if (action === "edit") {
      setRecordData(data);
      open();
    } else if (action === "delete") {
      modals.openConfirmModal({
        title: "Delete Payment",
        centered: true,
        children: <Text>Are you sure you want to delete this payment?</Text>,
        labels: { confirm: "Yes", cancel: "No" },
        onCancel: () => null,
        onConfirm: () =>
          deleteRecord.mutate({
            collection: "payments",
            recordID: data.id,
          }),
      });

      close();
    }
  };
  const queries = [
    summaryCompatible ? paged : fullPayments,
    summaryCompatible ? summary : null,
    areas,
    sections,
    bookers,
    parties,
    invoices,
    ...refQueries,
  ].filter(Boolean);
  if (checkSuccess(queries)) {
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
    } = summaryCompatible
      ? summaryCalculator(summary.data)
      : calculator(
          rows?.map((pmnt) => ({
            ...pmnt,
            expand: {
              ...pmnt.expand,
              party: { ...parties.data?.find((pty) => pty.id === pmnt.party) },
            },
          }))
        );

    return (
      <>
        <Group className={styles.hideOnPrint}>
          <Stack gap={0}>
            <DateInput
              value={fromDate}
              onChange={(v) =>
                setFromDate(
                  new Date(
                    new Date(v).getFullYear(),
                    new Date(v).getMonth(),
                    new Date(v).getDate(),
                    0,
                    0,
                    0,
                    0
                  )
                )
              }
              label='Date From'
            />
            <DateInput
              value={toDate}
              onChange={(v) =>
                setToDate(
                  new Date(
                    new Date(v).getFullYear(),
                    new Date(v).getMonth(),
                    new Date(v).getDate(),
                    23,
                    59,
                    59,
                    999
                  )
                )
              }
              label='Date To'
            />
          </Stack>
          <Stack gap={0}>
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
          </Stack>
          <Stack gap={0}>
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
          </Stack>
          <Stack gap={0}>
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
            <NSelect
              label={"Company"}
              value={form.values.company}
              onChange={(v) => {
                form.setFieldValue("company", v);
                form.setFieldValue("reportType", "company");
              }}
              dataQuery={{
                collectionName: "categories",
              }}
              dataQueryValue='id'
            />
          </Stack>
          <Stack>
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
            {/* POS-0026 — request the data only when Apply is pressed. */}
            <Button onClick={() => apply({ fromDate, toDate, ...form.values })}>APPLY</Button>
            <Button
              variant='default'
              onClick={() => {
                form.reset();
                setFromDate(initial.fromDate);
                setToDate(initial.toDate);
                reset();
              }}
            >
              RESET
            </Button>
          </Stack>
        </Group>
        <Group align='center' justify='space-between'>
          <Group>
            <Text variant='transparent' m={0} p={0} size='compact-lg' fw={"700"} c='black'>
              {applied.reportType === "" && `ALL PAYMENTS`}
              {applied.reportType === "sending" && `PURCHASES REPORT`}
              {applied.reportType === "recieving" && `SALES REPORT`}
              {applied.reportType === "return" && `RETURNS REPORT`}
              {applied.reportType === "area" && `AREA REPORT`}
              {applied.reportType === "section" && `SECTION REPORT`}
              {applied.reportType === "party" && `PARTY PAYMENTS REPORT`}
              {applied.reportType === "company" && `COMPANY WISE REPORT`}
              {applied.reportType === "booker" && `BOOKER INVOICE REPORT`}
              {applied.reportType === "invoice" && `INVOICE PAYMENTS REPORT`}
            </Text>
          </Group>
          <Group justify='end'>
            <Text size={"sm"}>{`DATE FROM: ${
              applied.fromDate !== null
                ? applied.fromDate.toLocaleDateString("en", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-"
            }`}</Text>
            <Text size={"sm"}>{`DATE TO: ${
              applied.toDate !== null
                ? applied.toDate.toLocaleDateString("en", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-"
            }`}</Text>
          </Group>
        </Group>
        <Group justify='start' gap={"4rem"}>
          {applied.booker && (
            <Text size={"sm"}>{`BOOKER: ${
              bookers.data.find((r) => r.id === applied.booker)?.name
            }`}</Text>
          )}
          {applied.party && (
            <Text size={"sm"}>{`Party: ${parties.data.find((r) => r.id === applied.party)?.name}`}</Text>
          )}
          {applied.section && (
            <Text size={"sm"}>{`Section: ${
              sections.data.find((r) => r.id === applied.section)?.name
            }`}</Text>
          )}
          {applied.area && (
            <Text size={"sm"}>{`Area: ${areas.data.find((r) => r.id === applied.area).name}`}</Text>
          )}
        </Group>
        <DataTable
          {...(summaryCompatible
            ? {
                page: page,
                onPageChange: setPage,
                totalRecords: paged.totalRecords,
                recordsPerPage: PER_PAGE,
                fetching: paged.isFetching,
              }
            : {})}
          classNames={{
            root: classes.root,
            table: classes.table,
            header: classes.header,
            footer: classes.footer,
            pagination: classes.pagination,
          }}
          style={{ border: "1px solid gray", borderRadius: "3px" }}
          withColumnBorders
          // emptyState={<></>}
          defaultColumnRender={(row, _, accessor) => {
            return row.hasOwnProperty("expand")
              ? row.expand.hasOwnProperty(accessor)
                ? row.expand[accessor].name || row.expand[accessor].value
                : row[accessor]
              : row[accessor];
          }}
          horizontalSpacing={2}
          verticalSpacing={0}
          records={rows}
          columns={tableStructure}
        />

        <Stack gap={0} style={{ width: "100%" }}>
          {applied.reportType !== "recieving" &&
            !applied.booker &&
            (applied.party
              ? parties.data.find((r) => r.id === applied.party)?.type !== "customer"
              : true) &&
            (applied.invoiceFilter
              ? invoices.data.find((r) => r.id === applied.invoiceFilter)?.type !== "sale"
              : true) && (
              <Flex gap={0} direction={"row"} justify={"space-evenly"} align={"end"} w={"100%"}>
                <Group justify='space-between' w={"25%"} mx={"0.5rem"}>
                  <Text>Purchase Amount</Text>
                  <Text>{sending}</Text>
                </Group>
                <Group justify='space-between' w={"25%"} mx={"0.5rem"}>
                  <Text>Paid Amount</Text>
                  <Text>{sent}</Text>
                </Group>
                <Group justify='space-between' w={"25%"} mx={"0.5rem"}>
                  <Text>Returns</Text>
                  <Text>{sendingReturns}</Text>
                </Group>
                <Group justify='space-between' w={"25%"} mx={"0.5rem"}>
                  <Text>Total Amount</Text>
                  <Text>{totalSending}</Text>
                </Group>
              </Flex>
            )}
          {applied.reportType !== "sending" &&
            (applied.party
              ? parties.data.find((r) => r.id === applied.party)?.type !== "supplier"
              : true) &&
            (applied.invoiceFilter
              ? invoices.data.find((r) => r.id === applied.invoiceFilter)?.type !== "purchase"
              : true) && (
              <Flex gap={0} direction={"row"} justify={"space-evenly"} align={"end"} w={"100%"}>
                <Group justify='space-between' w={"25%"} mx={"0.5rem"}>
                  <Text>Sale Amount</Text>
                  <Text>{recieving}</Text>
                </Group>
                <Group justify='space-between' w={"25%"} mx={"0.5rem"}>
                  <Text>Recieved Amount</Text>
                  <Text>{recieved}</Text>
                </Group>
                <Group justify='space-between' w={"25%"} mx={"0.5rem"}>
                  <Text>Returns</Text>
                  <Text>{recievingReturns}</Text>
                </Group>
                <Group justify='space-between' w={"25%"} mx={"0.5rem"}>
                  <Text>Total Amount</Text>
                  <Text>{totalRecieving}</Text>
                </Group>
              </Flex>
            )}
        </Stack>
        <Modal opened={opened} onClose={close}>
          <EditPayment close={close} recordData={recordData} />
        </Modal>
      </>
    );
  } else return <StatusCheck check={queries} />;
}
/**
 * POS-0015 — totals from the `payments_summary` view. The view precomputes the same
 * aggregates the JS calculator derives, so summing its grouped rows is equivalent;
 * see scripts/tests/test_summary_totals.py for the DB-level equivalence proof.
 */
function summaryCalculator(groups = []) {
  const sum = (key) => groups.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
  const sending = sum("sending");
  const sent = sum("sent");
  const recieving = sum("recieving");
  const recieved = sum("recieved");
  const sendingReturns = sum("sending_returns");
  const recievingReturns = sum("recieving_returns");
  const invoiceTotal = sum("invoice_total");
  const totalPaid = sum("total_paid");
  return {
    total: Number((invoiceTotal - totalPaid).toFixed(2)),
    totalSending: Number((sending - sent - sendingReturns).toFixed(2)),
    totalRecieving: Number((recieving - recieved - recievingReturns).toFixed(2)),
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
