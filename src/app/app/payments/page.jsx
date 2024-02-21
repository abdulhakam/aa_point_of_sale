"use client";
import NewPayment from "./NewPayment";
import PaymentsReport from "../reports/payments/PaymentsReport";

export default function Payments() {
  return (
    <>
      <NewPayment />
      <PaymentsReport />
    </>
  );
}

function getOutstandingPayments(payments) {
  const invoices = Object.values(
    payments.reduce((acc, obj) => {
      const invoiceId = obj.expand.invoice.id;
      const amount = Number(obj.amount).toPrecision(2) * (obj.paid ? -1 : 1);

      acc[invoiceId] = acc[invoiceId] || { ...obj, amount: 0, invoices: [] };
      acc[invoiceId].invoices.push(obj);
      acc[invoiceId].amount += amount;

      return acc;
    }, {})
  ).filter((invoice) => invoice.amount !== 0);
  return invoices;
}
