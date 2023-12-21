import { useQuery } from "@tanstack/react-query";
import { listItems } from "@/app/api/items";

export default function ReportTable(props){
  const items = useQuery({
    queryKey: ["items"],
    queryFn: listItems,
  });
  const { data, isError, error, isSuccess, isLoading } = items;
  return (
    <>
      {isLoading && <h1>LOADING...</h1>}
      {isError && <h1>{error.message}</h1>}
      {isSuccess && <h1>RePORTSTABLE</h1>}
    </>
  );
}