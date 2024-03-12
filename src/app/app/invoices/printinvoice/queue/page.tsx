"use client";
import { useLocalStorage } from "@mantine/hooks";
import PrintContent from "../../../../components/printing/PrintContent";
import { ActionIcon, Button, Group, Text, Tooltip } from "@mantine/core";
import InvoiceBody from "./invoicebody";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { IconPrinter, IconPrinterOff } from "@tabler/icons-react";
import { Invoices } from "@/app/api/types";

export default function InvoicePrintQueue() {
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `INVOICES`,
    pageStyle: "@page {size: A5; margin: 0.5cm 0.9cm 0.9cm 0.9cm !important;}",
  });
  const [printQueue, setPrintQueue, clear] = useLocalStorage<any[]>({
    key: "print-queue",
    defaultValue: [],
  });
  const noDuplicates = Array.from(new Set(printQueue));
  return (
    <>
      <Group>
        <Tooltip label='Print Invoices'>
          <ActionIcon size={"xl"} onClick={handlePrint}>
            <IconPrinter />
          </ActionIcon>
        </Tooltip>
        <Tooltip label='Clear Queue'>
          <ActionIcon size={"xl"} onClick={() => clear()}>
            <IconPrinterOff />
          </ActionIcon>
        </Tooltip>
      </Group>
      <div style={{height:"74vh", overflow:"scroll"}}>
        <div ref={printRef}>
          <PrintContent>
            {noDuplicates.length === 0 && <Text>Nothing in queue</Text>}
            {noDuplicates.map((itm) => (
              <InvoiceBody key={itm.invoice?.id} invoice={itm.invoice} transactions={itm.transactions.data} />
            ))}
          </PrintContent>
        </div>
      </div>
    </>
  );
}
