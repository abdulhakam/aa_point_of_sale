"use client";
import { useLocalStorage } from "@mantine/hooks";
import PrintContent from "../../../../components/printing/PrintContent";
import { ActionIcon, Button, Flex, Group, Stack, Text, Tooltip } from "@mantine/core";
import InvoiceBody from "./invoicebody";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { IconPrinter, IconPrinterOff, IconTrash } from "@tabler/icons-react";
import styles from "@/app/components/printing/styles.module.css";

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
  const noDuplicates = printQueue.filter(
    (value, index, self) => index === self.findIndex((t) => t.invoice.invoiceNo === value.invoice.invoiceNo)
  );
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
      <div style={{ height: "74vh", overflow: "scroll" }}>
        <div ref={printRef}>
          <PrintContent
            footer={
              <footer className={styles.showOnPrint}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Stack gap={0}>
                    <Text size='10pt'>Checked By: ABDUL MAJID </Text>
                    <Text size='10pt'>{process.env.NEXT_PUBLIC_PHONE}</Text>
                    {/* {process.env.NEXT_PUBLIC_NAME} {process.env.NEXT_PUBLIC_PHONE}{" "} */}
                  </Stack>
                  <Stack gap={0}>
                    <Text size='10pt'>Delivered By: OSAMA</Text>
                    <Text size='10pt'>0315-3730881</Text>
                  </Stack>
                </div>
              </footer>
            }
          >
            {noDuplicates.length === 0 && <Text>Nothing in queue</Text>}
            {noDuplicates.map((itm, i) => (
              <div key={itm.invoice?.id}>
                <InvoiceBody
                  inline
                  breakAfter={i < noDuplicates.length - 1}
                  invoice={itm.invoice}
                  transactions={itm.transactions.data}
                >
                  <Flex mt={"-2rem"} justify='end'>
                    <ActionIcon
                      variant='outline'
                      onClick={() => {
                        noDuplicates.splice(i, 1)
                        setPrintQueue(noDuplicates);
                      }}
                    >
                      <IconTrash />
                    </ActionIcon>
                  </Flex>
                </InvoiceBody>
              </div>
            ))}
          </PrintContent>
        </div>
      </div>
    </>
  );
}
