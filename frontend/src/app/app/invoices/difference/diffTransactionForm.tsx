"use client";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { itemCreateForm, itemFormStructure } from "@/app/api/items";
import useCRUD, { crud } from "@/app/api/useAPI";
import FormGenerator from "@/app/components/FormGenerator";
import FormGeneratorBasic from "@/app/components/FormGeneratorBasic";
import { getQty, qtyInput } from "@/app/components/functions/qtyParser";
import { Button, Select, NumberInput, Flex, Modal, ActionIcon, Tooltip, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAdjustmentsDollar, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function DiffTransactionForm(props) {
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
      setBoxes(0);
      setPcs(0);
      setSalePrice(0);
      setDrs(0);
      setTot(0);
    },
  });

  const [item, setItem] = useState("");
  const [boxes, setBoxes] = useState(0);
  const [pcs, setPcs] = useState(0);
  const [scheme, setScheme] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [disc_1, setD1] = useState(0);
  const [disc_2, setD2] = useState(0);
  const [disc_rs, setDrs] = useState(0);
  const [total, setTot] = useState(0);
  const [itemData, setItemData] = useState<any>({});

  function submitHandler(e) {
    e.preventDefault(e);
    const data = {
      invoice: props.invoice,
      item: item,
      qty: qtyInput(itemData, boxes, pcs),
      scheme: scheme,
      cost_price: purchasePrice,
      price: purchasePrice,
      discount_1: disc_1,
      discount_2: disc_2,
      discount_rs: disc_rs,
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
    setSalePrice(price);
    setPurchasePrice(pp);
    discCalc(props.type === "purchase" ? pp : price, qtyInput(itemData, boxes, pcs), disc_1, disc_2, disc_rs);
  }
  const discCalc = (p, qty, d1, d2, drs) => {
    const dis1 = p * qty * (d1 / 100);
    const dis2 = (p * qty - dis1) * (d2 / 100);
    setTot(p * qty - dis1 - dis2 - drs);
  };

  // const queries = [invoiceData];
  // if (checkSuccess(queries)) {
  return (
    <>
      <form onSubmit={submitHandler}>
        <Flex my='0' justify={"space-between"} align={"end"}>
          <Select
            required
            allowDeselect={false}
            style={{ width: `${props.type === "purchase" ? "30%" : "40%"}` }}
            searchable
            label={"Item"}
            value={item}
            onChange={(v) => {
              setItem(v);
              setItemData(props.items.find((itm) => itm.id == v));
              setPrice(v);
            }}
            data={props.items.map((itm) => ({ value: itm.id, label: `${itm.name}` }))}
          />
          <NumberInput
            style={{ width: "5%" }}
            label="Box Size"
            rightSectionWidth={0}
            readOnly
            value = {itemData.box_size_qty}
            />
          <TextInput
            style={{ width: "10%" }}
            label='QTY'
            value={`${getQty(itemData, itemData.qty).ctns} ctns ${
              getQty(itemData, itemData.qty).units
            } units`}
          />
          <NumberInput
            style={{ width: "6%" }}
            label='CP'
            rightSectionWidth={0}
            readOnly={props.type !== "purchase" ? true : false}
            value={purchasePrice}
            onChange={(v) => {
              setPurchasePrice(Number(v));
              discCalc(Number(v), qtyInput(itemData, boxes, pcs), disc_1, disc_2, disc_rs);
            }}
          />
          <NumberInput
            style={{ width: "6%" }}
            label='SP'
            readOnly={props.type === "purchase" ? true : false}
            value={salePrice}
            onChange={(v) => {
              setSalePrice(Number(v));
              discCalc(
                props.type === "purchase" ? purchasePrice : Number(v),
                qtyInput(itemData, boxes, pcs),
                disc_1,
                disc_2,
                disc_rs
              );
            }}
          />
          <NumberInput
            style={{ width: "8%" }}
            label='Units(Priced)'
            rightSectionWidth={0}
            value={pcs}
            onChange={(v) => {
              setPcs(Number(v));
              discCalc(
                props.type === "purchase" ? purchasePrice : salePrice,
                qtyInput(itemData, boxes, Number(v)),
                disc_1,
                disc_2,
                disc_rs
              );
            }}
          />
          <NumberInput
            style={{ width: "10%" }}
            label='Units(UNPRICED)'
            rightSectionWidth={0}
            value={scheme}
            onChange={(v) => {
              setScheme(Number(v));
            }}
          />
          <NumberInput style={{ width: "7%" }} readOnly label='total' value={total} />
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

      <Modal centered size={"auto"} opened={niOpened} onClose={niClose} title='Create New Item'>
        <FormGeneratorBasic close={niClose} editable formStructure={itemCreateForm} />
      </Modal>
    </>
  );
  // } else return <StatusCheck check={queries} />;
}
