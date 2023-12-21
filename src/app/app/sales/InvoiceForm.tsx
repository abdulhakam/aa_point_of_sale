"use client";
import { getUser } from "@/app/api/aa_users";
import { useInvoices } from "@/app/api/invoices";
import { useParties } from "@/app/api/parties";
import { checkError, checkLoading, checkSuccess, getError } from "@/app/api/statusCheck";
import idGenerator from "@/app/components/functions/idGenerator";
import pb from "@/app/pocketbase";
import {
  TextInput,
  Button,
  Group,
  Box,
  Input,
  Select,
  NumberInput,
  Textarea,
  Container,
  Flex,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Transactions from "./transactions";

function useInvoiceData() {
  const invoices = useInvoices();
  const saleInvoices = invoices.saleInvoices;
  const parties = useParties();
  const user = useQuery({
    queryKey: ["user", pb.authStore.model.id],
    queryFn: async () => await getUser(pb.authStore.model.id),
  });
  const isError = checkError([invoices, parties, user]);
  const isLoading = checkLoading([invoices, parties, user]);
  const isSuccess = checkSuccess([invoices, parties, user]);
  const error = getError([invoices, parties, user]);
  return { isError, isLoading, isSuccess, error, saleInvoices, parties, user };
}
export default function InvoiceMakerForm(props) {
  const { saleInvoices, parties, user, isLoading, isError, isSuccess, error } = useInvoiceData();
  const [formState, setFormState] = useState({
    id: "",
    invoice_maker: isSuccess ? user.data.id : "",
    transactions: [],
    party: "pty000000000000",
    type: props.type || "sale",
    total: 0,
    discount_1: 0,
    discount_2: 0,
    total_after_discount: 0,
    description: "",
  });
  useEffect(()=>{
    if(isSuccess){
    setFormState(prev=>({...prev,id:idGenerator(saleInvoices.length+1,formState.type==='sale'?'pos':'pop')}))}
  },[isSuccess])
  const valueChanger = (prev, k, v) => ({
    ...prev,
    [k]: v,
    total_after_discount:
      (k === "total" ? v : prev.total) -
      (k === "discount_1" ? v : prev.discount_1) -
      (k === "discount_2" ? v : prev.discount_2),
  });
  return (
    <>
      {isLoading ? (
        <h1>loading...</h1>
      ) : isError ? (
        <h3>{error.message}</h3>
      ) : (
        isSuccess && (
          <Container size={"xl"}>
            <Flex style={{ height: "96vh" }} direction={"column"} justify={"space-between"}>
              <Group style={{}} justify='space-between'>
                <Flex direction={"column"}>
                  <TextInput
                    size='xs'
                    style={{ width: "9rem" }}
                    label='Invoice No.'
                    onChange={(v) => setFormState((prev) => valueChanger(prev, "id", v))}
                    value={formState.id}
                  />
                  <Select
                    size='xs'
                    style={{ width: "9rem" }}
                    label='Invoice Type'
                    data={["sale", "purchase"]}
                    onChange={(v) => setFormState((prev) => valueChanger(prev, "type", v))}
                    value={formState.type}
                  />
                </Flex>
                <Flex direction={"column"}>
                  <TextInput
                    size='xs'
                    style={{ width: "9rem" }}
                    readOnly
                    label='USER'
                    value={user.data.name}
                  />
                  <Input type='hidden' value={formState.transactions} />
                  <Select
                    size='xs'
                    style={{ width: "12rem" }}
                    label={"Customer"}
                    searchable
                    data={parties.customers.map((c) => ({ value: c.id, label: c.name }))}
                    onChange={(v) => setFormState((prev) => valueChanger(prev, "party", v))}
                    value={formState.party}
                  />
                </Flex>
                <Textarea
                  size='xs'
                  styles={{ input: { height: "5rem",width:"18rem" } }}
                  label='description'
                  onChange={(v) => {
                    setFormState((prev) => valueChanger(prev, "description", v));
                  }}
                  value={formState.description}
                />
              </Group>
              <Transactions/>
              <Flex direction={"column"} align={"flex-end"} justify='flex-end'>
                <NumberInput
                  style={{ width: "9rem" }}
                  label='total'
                  onChange={(v) => {
                    setFormState((prev) => valueChanger(prev, "total", v));
                  }}
                  value={formState.total}
                  hideControls
                />
                <Flex>
                  <NumberInput
                    style={{ width: "9rem" }}
                    label='discount_1'
                    onChange={(v) => {
                      setFormState((prev) => valueChanger(prev, "discount_1", v));
                    }}
                    value={formState.discount_1}
                    hideControls
                  />
                  <NumberInput
                    style={{ width: "9rem" }}
                    label='discount_2'
                    onChange={(v) => {
                      setFormState((prev) => valueChanger(prev, "discount_2", v));
                    }}
                    value={formState.discount_2}
                    hideControls
                  />
                  <NumberInput
                    readOnly
                    style={{ width: "9rem" }}
                    label='total_after_discount'
                    value={formState.total_after_discount}
                    hideControls
                  />
                </Flex>
                <Button type='submit'>Complete</Button>
              </Flex>
            </Flex>
          </Container>
        )
      )}
    </>
  );
}
