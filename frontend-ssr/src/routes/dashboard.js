import express from "express";
import { requireAuth } from "../lib/auth.js";
import { page, ah } from "../lib/http.js";

/** Dashboard: the `counts_for_row_numbers` counters plus shortcuts. */
export function dashboardRoutes({ config, render, reports }) {
  const router = express.Router();

  router.get("/", (req, res) => res.redirect(req.token ? "/dashboard" : "/login"));

  router.get(
    "/dashboard",
    requireAuth,
    ah(async (req, res) => {
      const { views } = await reports.getViews(req.token);
      const c = views.counts;
      const tiles = [
        { label: "Sections", value: c.sections },
        { label: "Areas", value: c.areas },
        { label: "Item Companies", value: c.categories },
        { label: "Parties", value: c.parties },
        { label: "Order Bookers", value: c.order_bookers },
        { label: "Items", value: c.items },
        { label: "Purchase Invoices", value: c.purchase_invoices },
        { label: "Sale Invoices", value: c.sale_invoices },
        { label: "Return Invoices", value: c.return_invoices },
        { label: "Recieving Payments", value: c.recieving_payments },
        { label: "Sending Payments", value: c.sending_payments },
      ];
      res.send(
        page(
          {
            appName: config.appName,
            render,
            user: { email: req.session?.email, name: req.session?.name },
            active: "dashboard",
            title: "Dashboard",
          },
          "dashboard/index.html",
          {
            tiles,
            shortcuts: [
              { title: "Reports", target: "reports", tone: "pink" },
              { title: "Management", target: "management", tone: "gray" },
            ],
          }
        )
      );
    })
  );

  return router;
}
