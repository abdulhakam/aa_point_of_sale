"use client";
import pb from "@/app/pocketbase";
import { useIsFetching, useIsMutating, useQuery } from "@tanstack/react-query";
import { useParties } from "@/app/api/parties";
import { listItems } from "@/app/api/items";
import {
  Autocomplete,
  Button,
  Container,
  Flex,
  Group,
  Select,
  Table,
  TableData,
  Text,
  TextInput,
} from "@mantine/core";
import idGenerator from "@/app/components/functions/idGenerator";
import { getUser } from "@/app/api/users";
import { useTime } from "@/app/hooks/useTime";
import { useInvoices } from "@/app/api/invoices";
import { checkError, checkLoading, checkSuccess, getError } from "@/app/api/statusCheck";
import { TransactionForm } from "./TransactionForm";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
export default function InvoiceMaker() {
  const items = useQuery({ queryKey: ["items"], queryFn: listItems });
  const invoices = useInvoices();
  const saleInvoices = invoices.saleInvoices;
  const [invoiceNo,setInvoiceNo] = useState('')
  const parties = useParties();
  const user = useQuery({
    queryKey: ["user", pb.authStore.model.id],
    queryFn: async () => await getUser(pb.authStore.model.id),
  });
  
  const isError = checkError([items, invoices, parties, user]);
  const isLoading = checkLoading([items, invoices, parties, user]);
  const isSuccess = checkSuccess([items, invoices, parties, user]);
  const error = getError([items, invoices, parties, user]);
  useEffect(()=>{
    setInvoiceNo(idGenerator(saleInvoices?.length + 1, "POS"))

  },[isSuccess])
  const tableData: TableData = {
    head: ["#", "Item Name", "Price","qty", "disc 1", "disc 2", "total"],
  };

  return (
    <>
      {isLoading ? (
        <h1>Loading</h1>
      ) : isError ? (
        <h1>{error?.message}</h1>
      ) : isSuccess ? (
        <Container size={"xl"}>
          <Text size='xl' fw={600}>
            Sale Invoice
          </Text>
          <hr />
          <Group justify='space-between'>
            <Group>
              <Text>Invoice#:</Text>
              <Autocomplete
              name="invoiceNo"
              variant="filled"
                style={{width:'9rem'}}
                data={saleInvoices.map((inv) => inv.id)}
                defaultValue={invoiceNo}
              />
            </Group>
            <Group>
              <Text span>Party:</Text>
              <Select
              searchable
                style={{ width: "12rem" }}
                size='md'
                variant='unstyled'
                defaultValue="pty000000000000"
                data={parties.customers.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Group>
            <Text>Invoice Maker:{`${user.data.name}`}</Text>
          </Group>

          <Table.ScrollContainer minWidth={960}><Table stickyHeader withColumnBorders withTableBorder highlightOnHover data={tableData} /></Table.ScrollContainer>
          <Button> Add Sale </Button>
          <TransactionForm invoice={invoiceNo} items={items.data}/>
        </Container>
      ) : null}
    </>
  );
}

