"use client";
import { itemFormStructure } from "@/app/api/items";
import useCRUD, { crud } from "@/app/api/useAPI";
import FormGenerator from "@/app/components/FormGenerator";
import { Button, Select, NumberInput, Flex, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function TransactionForm(props) {
  const qc = useQueryClient();
  const [itemSP, setSP] = useState(0);
  const [opened, { open, close }] = useDisclosure(false);
  const [niOpened, { open: niOpen, close: niClose }] = useDisclosure(false);
  const categories = useCRUD().fullList({ collection: "categories" });
  const itemformStructure = { ...itemFormStructure, queryKey: "items" };
  itemformStructure.fields.category.baseProps.data = categories.data?.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));
  const updateItemSP = useMutation({
    mutationFn: crud.update,
    onSuccess: () => {
      qc.invalidateQueries();
      close();
    },
  });
  const addTransaction = useMutation({
    mutationFn: crud.create,
    onSuccess: () => {
      qc.invalidateQueries();
      setItem("");
      setQty(1);
      setItemPrice(0);
      setD1(0);
      setD2(0);
      setTot(0);
    },
  });

  const [item, setItem] = useState("");
  const [qty, setQty] = useState(1);
  const [purchasePrice,setPurchasePrice]=useState(0)
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
    const pp = item.cost_price || 0;
    setItemPrice(price);
    setPurchasePrice(pp)
    setTot(price * qty - disc_1 - disc_2);
  }
  return (
    <>
      <form onSubmit={submitHandler}>
        <Flex my='0' align={"end"}>
          <Select
            required
            style={{ width: `${props.type==='sale'?"47%":"36%"}` }}
            searchable
            label={"Item"}
            value={item}
            onChange={(v) => {
              setItem(v);
              setPrice(v);
            }}
            data={props.items.map((itm) => ({ value: itm.id, label: itm.name }))}
          />
          {props.type !== "sale" && (
            <NumberInput
              style={{ width: "11%" }}
              label='PP/CP'
              // readOnly={props.type === "sale" ? true : false}
              value={purchasePrice}
              onChange={(v) => {
                setPurchasePrice(Number(v));
                setTot(Number(v) * qty - disc_1 - disc_2);
              }}
            />
          )}
          <NumberInput
            style={{ width: "11%" }}
            label='Price'
            readOnly={props.type === "sale" ? false : true}
            value={itemPrice}
            onChange={(v) => {
              setItemPrice(Number(v));
              setTot((props.type==='sale'?Number(v):purchasePrice) * qty - disc_1 - disc_2);
            }}
          />
          <NumberInput
            style={{ width: "11%" }}
            label='Qty'
            value={qty}
            onChange={(v) => {
              setQty(Number(v));
              setTot((props.type==='sale'?itemPrice:purchasePrice) * Number(v) - disc_1 - disc_2);
            }}
          />
          <NumberInput
            style={{ width: "11%" }}
            label='discount_1'
            value={disc_1}
            onChange={(v) => {
              setD1(Number(v));
              setTot((props.type==='sale'?itemPrice:purchasePrice) * qty - Number(v) - disc_2);
            }}
          />
          <NumberInput
            style={{ width: "11%" }}
            label='discount_2'
            value={disc_2}
            onChange={(v) => {
              setD2(Number(v));
              setTot((props.type==='sale'?itemPrice:purchasePrice) * qty - disc_1 - Number(v));
            }}
          />
          <NumberInput style={{ width: "11%" }} readOnly label='total' value={total} />
          <Button type='submit'>Add</Button>
        </Flex>
      </form>
      <Modal centered opened={opened} onClose={close} title='Update Price'>
        <NumberInput label={"New Price for Item"} value={itemSP} onChange={(v) => setSP(Number(v))} />
        <Button
          mt={"sm"}
          onClick={() => {
            updateItemSP.mutate({ collection: "items", recordID: item, data: { sale_price: itemSP } });
          }}
        >
          OK
        </Button>
      </Modal>

      <Modal centered size={"auto"} opened={niOpened} onClose={niClose} title='Create New'>
        <FormGenerator close={niClose} editable formStructure={itemformStructure} />
      </Modal>
      {props.type !== "sale" && (
        <Flex justify={"end"} gap={"md"}>
          <Button w={"12rem"} onClick={()=>{open();setSP(itemPrice)}}>
            Update Item Price
          </Button>
          <Button onClick={niOpen}> Create New Item</Button>
        </Flex>
      )}
    </>
  );
}
