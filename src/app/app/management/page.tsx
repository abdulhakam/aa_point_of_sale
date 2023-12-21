'use client'
import { Button } from "@mantine/core";
import { useRouter } from "next/navigation";

export default function ManagementPage(){
  const router = useRouter()
  return (
    <>
    <h1>Manage</h1>
    <Button onClick={()=>router.push('management/areas')} variant={"subtle"}>areas</Button>
    <Button variant={"subtle"}>bookers</Button>
    <Button variant={"subtle"}>categories</Button>
    </>
  )
}