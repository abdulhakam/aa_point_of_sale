'use client'
import { crud } from "@/app/api/useAPI";
import { Button, Select, NumberInput, Flex, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function TransactionForm(props) {
  const [opened, { open, close }] = useDisclosure(false);

  const qc = useQueryClient();
  const addTransaction = useMutation({
    mutationFn: crud.create,
    onSuccess: () => {
      qc.invalidateQueries();
      setItem("");
      setQty(0);
      setItemPrice(0);
      setD1(0);
      setD2(0);
      setTot(0);
    },
  });

  const [item, setItem] = useState("");
  const [qty, setQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [disc_1, setD1] = useState(0);
  const [disc_2, setD2] = useState(0);
  const [total, setTot] = useState(0);

  function submitHandler(e) {
    e.preventDefault(e);
    const data = {
      invoice: props.invoice,
      item: item,
      qty: qty,
      price: itemPrice,
      discount_1: disc_1,
      discount_2: disc_2,
    };
    addTransaction.mutate({
      collection: "transactions",
      data,
    });
  }
  function setPrice(itemId) {
    const item = props.items.find((item) => item.id === itemId);
    const price = item.sale_price || 0;
    setItemPrice(price);
    setTot(price * qty - disc_1 - disc_2);
  }
  return (
    <>
      <form onSubmit={submitHandler}>
        <Flex my='xs' align={"end"}>
          <Select
            required
            style={{ width: "47%" }}
            searchable
            label={"Item"}
            value={item}
            onChange={(v) => {
              setItem(v);
              setPrice(v);
            }}
            data={props.items.map((itm) => ({ value: itm.id, label: itm.name }))}
          />
          <NumberInput
            style={{ width: "11%" }}
            label='Price'
            readOnly={props.type === "sale" ? true : false}
            value={itemPrice}
            onChange={(v) => {
              setItemPrice(Number(v));
              setTot(Number(v) * qty - disc_1 - disc_2);
            }}
          />
          <NumberInput
            style={{ width: "11%" }}
            label='Qty'
            value={qty}
            onChange={(v) => {
              setQty(Number(v));
              setTot(itemPrice * Number(v) - disc_1 - disc_2);
            }}
          />
          <NumberInput
            style={{ width: "11%" }}
            label='discount_1'
            value={disc_1}
            onChange={(v) => {
              setD1(Number(v));
              setTot(itemPrice * qty - Number(v) - disc_2);
            }}
          />
          <NumberInput
            style={{ width: "11%" }}
            label='discount_2'
            value={disc_2}
            onChange={(v) => {
              setD2(Number(v));
              setTot(itemPrice * qty - disc_1 - Number(v));
            }}
            />
          <NumberInput style={{ width: "11%" }} readOnly label='total' value={total} />
            {props.type==='purchase'?<Button onClick={open}>Update Item Sale Price</Button>:null}
          <Button type='submit'>Add</Button>
        </Flex>
      </form>
      <Modal opened={opened} onClose={close} title='Update Price'></Modal>
    </>
  );
}
