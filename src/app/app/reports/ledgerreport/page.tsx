import useCRUD from "@/app/api/useAPI";

export default function LedgerReport() {
  const ledger = useCRUD().fullList({
    collection: "ledger_general_cols",
    filter: `created >= '${fromDate.toISOString().slice(0, 19).replace("T", " ")}' && created <= '${toDate
      .toISOString()
      .slice(0, 19)
      .replace("T", " ")}'`,
  });
  return (
    <div>
      <h1>Ledger Report</h1>
    </div>
  );
}
//TODO: THIS IS IMPORTANT!