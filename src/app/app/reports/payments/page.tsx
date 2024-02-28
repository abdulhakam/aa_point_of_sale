"use client";
import { ActionIcon, Group } from "@mantine/core";
import PaymentsReport from "./PaymentsReport";
import { IconPrinter } from "@tabler/icons-react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import PrintContent from "@/app/components/printing/PrintContent";

export default function Payments() {
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Payment Report",
    pageStyle: `@page {size: A4; margin: 0.6cm 1.0cm 0.6cm 0.5cm !important;`,
  });
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
      <div style={{ marginLeft: "1em", marginRight: "1em" }} ref={printRef}>
        <PrintContent >
          <PaymentsReport />
        </PrintContent>
      </div>
    </>
  );
}
