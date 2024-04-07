"use client";

import { Button, Center, Code, Stack, Text } from "@mantine/core";
import { DataTable } from "mantine-datatable";

export default function InvoiceDataTable(props) {
  return (
    <DataTable
    withColumnBorders
      textSelectionDisabled
      withTableBorder
      columns={props.columns}
      records={[]}
      // onRowClick={({ record, index, event }) => {
      //   openModal({
      //     title: "Company information",
      //     children: (
      //       <Stack>
      //         <Text size='sm'>
      //           You clicked on row[{index}], referring to company <em>{record.name}</em>.
      //           <br />
      //           {event.shiftKey && (
      //             <>
      //               You pressed the <Code>Shift</Code> key when clicking.
      //               <br />
      //             </>
      //           )}
      //           {event.ctrlKey && (
      //             <>
      //               You pressed the <Code>Ctrl</Code> key when clicking.
      //               <br />
      //             </>
      //           )}
      //           {event.altKey && (
      //             <>
      //               You pressed the <Code>Alt</Code> key when clicking.
      //               <br />
      //             </>
      //           )}
      //           {event.metaKey && (
      //             <>
      //               You pressed the <Code>Meta</Code> key when clicking.
      //               <br />
      //             </>
      //           )}
      //         </Text>
      //         <Center>
      //           <Button fullWidth onClick={() => closeAllModals()}>
      //             OK
      //           </Button>
      //         </Center>
      //       </Stack>
      //     ),
      //   });
      // }}
    />
  );
}
