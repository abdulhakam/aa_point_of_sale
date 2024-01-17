"use client";

import CreateRecord from "@/app/components/CreateRecord/CreateRecord";
import useCRUD, { crud } from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { IconCashBanknote } from "@tabler/icons-react";
import { Button, Checkbox, NumberInput, Select, Stack, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
export default function NewPayment() {
  const queryClient = useQueryClient();
  const parties = useCRUD().fullList({ collection: "parties" });
  const createPayment = useMutation({
    mutationFn: crud.create,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  })
  const [type, setType] = useState("");
  const [party, setParty] = useState("");
  const [paid, setPaid] = useState(true);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("payment");

  function autoSelectType(party) {
    const partyType = parties.data?.find((pty) => pty.id === party)?.type;
    setType(partyType === "customer" ? "recieving" : "sending");
  }

  function submitHandler(){
    const data = {
      party: party,
      type: type,
      paid: paid,
      amount: amount,
      description: description,
    }
    createPayment.mutate({collection:'payments',data})
  }

  const queries = [parties];
  if (checkSuccess(queries)) {
    return (
      <CreateRecord icon={<IconCashBanknote />} label={"New Payment"}>
          <Stack gap={"xs"}>
            <Select
              label='Party'
              searchable
              data={parties.data?.map((party) => ({ value: party.id, label: party.name }))}
              value={party}
              onChange={(v)=>{setParty(v);autoSelectType(v)}}
              required
            />
            <Select
              label='Type'
              searchable
              data={["sending", "recieving"]}
              value={type}
              onChange={setType}
              required
            />
            <Checkbox
              label='Paid'
              checked={paid}
              onChange={(event) => setPaid(event.currentTarget.checked)}
            />
            <NumberInput label='Amount' value={amount} onChange={(v) => setAmount(Number(v))} />
            <Textarea
              label='description'
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
            <Button onClick={()=>submitHandler()}>Submit</Button>
          </Stack>
        
      </CreateRecord>
    );
  } else return <StatusCheck check={queries} />;
}
