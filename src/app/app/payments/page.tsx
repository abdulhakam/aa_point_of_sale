"use client";
import { ActionIcon, Group } from "@mantine/core";
import PaymentsReport from "./PaymentsReport";
import NumberAddress from "@/app/components/NumberAddress/NumberAddress";
import { IconPrinter } from "@tabler/icons-react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import PrintHead from "@/app/components/printing/PrintHead";

export default function Payments() {
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
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
      <div style={{marginLeft:'1em',marginRight:'1em'}} ref={printRef}>
        <PrintHead/>
        <hr/>
        <PaymentsReport />
      </div>
    </>
  );
}
