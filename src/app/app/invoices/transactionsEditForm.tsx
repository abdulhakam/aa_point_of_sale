"use client";
import { itemCreateForm, itemFormStructure } from "@/app/api/items";
import useCRUD, { crud } from "@/app/api/useAPI";
import FormGeneratorBasic from "@/app/components/FormGeneratorBasic";
import { getQty, getQtyFromString, qtyInput } from "@/app/components/functions/qtyParser";
import { Button, Select, NumberInput, Flex, Modal, ActionIcon, Tooltip, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAdjustmentsDollar, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function TransactionEditForm(props) {
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
  const editTransaction = useMutation({
    mutationFn: crud.update,
    onSuccess: () => {
      qc.invalidateQueries();
      close()
    },
  });
  const {ctns,units}=getQtyFromString(props.data.qty)
  const [item, setItem] = useState(props.data.item);
  const [boxes, setBoxes] = useState(Number(ctns));
  const [pcs, setPcs] = useState(Number(units));
  const [scheme, setScheme] = useState(props.data.scheme);
  const [purchasePrice, setPurchasePrice] = useState(props.data.expand?.item.cost_price||0);
  const [itemPrice, setItemPrice] = useState(props.data.expand?.item.sale_price||0);
  const [disc_1, setD1] = useState(props.data.discount_1);
  const [disc_2, setD2] = useState(props.data.discount_2);
  const [total, setTot] = useState(props.data.total);
  const [itemData, setItemData] = useState(props.data.expand?.item||{});


  function submitHandler(e) {
    e.preventDefault(e);
    const data = {
      id: props.data.id,
      item: item,
      qty: qtyInput(itemData, Number(boxes), Number(pcs)),
      scheme: scheme,
      discount_1: disc_1,
      discount_2: disc_2,
    };
    editTransaction.mutate({
      recordID:data.id,
      collection: "transactions",
      data,
    });
  }
  function setPrice(itemId) {
    const item = props.items.find((item) => item.id === itemId);
    const price = item.sale_price || 0;
    const pp = item.cost_price || 0;
    setItemPrice(price);
    setPurchasePrice(pp);
    discCalc(props.type === "sale" ? price : pp, qtyInput(itemData, boxes, pcs), disc_1, disc_2);
  }
  const discCalc = (p, qty, d1, d2) => {
    const dis1 = p * qty * (d1 / 100);
    const dis2 = (p * qty - dis1) * (d2 / 100);
    setTot(p * qty - dis1 - dis2);
  };
  return (
    <>
      <form onSubmit={submitHandler}>
        <Flex direction={"column"} my='0'>
          <Group w={"100%"} justify='space-between' align='end'>
            <Select
              required
              w={"85%"}
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
            <Tooltip label='Create New item'>
              <ActionIcon onClick={niOpen}>
                <IconPlus />
              </ActionIcon>
            </Tooltip>
          </Group>
          {props.type !== "sale" && (
            <NumberInput
              label='PP/CP'
              rightSectionWidth={0}
              // readOnly={props.type === "sale" ? true : false}
              value={purchasePrice}
              onChange={(v) => {
                setPurchasePrice(Number(v));
                discCalc(Number(v), qtyInput(itemData, boxes, pcs), disc_1, disc_2);
              }}
            />
          )}
          <Group w={"100%"} justify='space-between' align='end'>
            <NumberInput
              style={{ width: "85%" }}
              label='SP'
              readOnly={props.type === "sale" ? false : true}
              value={itemPrice}
              onChange={(v) => {
                setItemPrice(Number(v));
                discCalc(
                  props.type === "sale" ? Number(v) : purchasePrice,
                  qtyInput(itemData, boxes, pcs),
                  disc_1,
                  disc_2
                );
              }}
            />
            <Tooltip label='Adjust Sale Price'>
              <ActionIcon
                onClick={() => {
                  open();
                  setSP(itemPrice);
                }}
              >
                <IconAdjustmentsDollar />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Group w={"100%"} justify='space-between' align='end'>
            <NumberInput
              style={{ width: "30%" }}
              label='Boxes'
              rightSectionWidth={0}
              value={boxes}
              onChange={(v) => {
                setBoxes(Number(v));
                discCalc(
                  props.type === "sale" ? itemPrice : purchasePrice,
                  qtyInput(itemData, Number(v), pcs),
                  disc_1,
                  disc_2
                );
              }}
            />
            <NumberInput
              style={{ width: "30%" }}
              label='Pcs'
              rightSectionWidth={0}
              value={pcs}
              onChange={(v) => {
                setPcs(Number(v));
                discCalc(
                  props.type === "sale" ? itemPrice : purchasePrice,
                  qtyInput(itemData, boxes, Number(v)),
                  disc_1,
                  disc_2
                );
              }}
            />
            <NumberInput
              style={{ width: "30%" }}
              label='Scheme'
              rightSectionWidth={0}
              value={scheme}
              onChange={(v) => {
                setScheme(Number(v));
              }}
            />
          </Group>
          <Group w={"100%"} justify='space-between' align='end'>
            <NumberInput
              style={{ width: "30%" }}
              label='discount_1'
              rightSectionWidth={0}
              value={disc_1}
              onChange={(v) => {
                setD1(Number(v));
                discCalc(
                  props.type === "sale" ? itemPrice : purchasePrice,
                  qtyInput(itemData, boxes, pcs),
                  Number(v),
                  disc_2
                );
              }}
            />
            <NumberInput
              style={{ width: "30%" }}
              label='discount_2'
              rightSectionWidth={0}
              value={disc_2}
              onChange={(v) => {
                setD2(Number(v));
                discCalc(
                  props.type === "sale" ? itemPrice : purchasePrice,
                  qtyInput(itemData, boxes, pcs),
                  disc_1,
                  Number(v)
                );
              }}
            />
            <NumberInput style={{ width: "30%" }} readOnly label='total' value={total} />
          </Group>
          <Button mt="xs" type='submit'>Add</Button>
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
}
