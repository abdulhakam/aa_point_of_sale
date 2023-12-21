"use client";

import { useQuery } from "@tanstack/react-query";
import { ViewTable } from "../../components/ViewTable";

import { CreateCustomerModal } from "./CustomerView";
import { Text } from "@mantine/core";
import { listAreas } from "../../api/areas";
import { useParties } from "@/app/api/parties";
import { checkError, checkLoading, checkSuccess, getError } from "@/app/api/statusCheck";
const tableStructure = { id: "id", name: "Name",type:'Type', phone: "Phone Number", address: "Address", area: "Area" };
export default function CustomersPage(props) {
  const parties = useParties();
  const areaQuery = useQuery({ queryKey: ["areas"], queryFn: listAreas });
  return checkLoading([areaQuery, parties]) ? (
    <Text>Loading...</Text>
  ) : checkError([areaQuery, parties]) ? (
    <h1>{getError([areaQuery, parties]).message} </h1>
  ) : checkSuccess([areaQuery, parties]) ? (
    <>
      <CreateCustomerModal areas={areaQuery.data} />
      <ViewTable data={parties.customers} tableStructure={tableStructure} expand={['area']} />
    </>
  ) : null;
}
