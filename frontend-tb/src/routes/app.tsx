import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

const AppLayout = () => (
  <>
    <div className='p-2 flex gap-2'>
      <Link to='/app' className='[&.active]:font-bold'>
        Dashboard
      </Link>{" "}
      <Link to='/app/management' className='[&.active]:font-bold'>
        Management
      </Link>
    </div>
    <hr />
    <Outlet />
  </>
);

export const Route = createFileRoute("/app")({ component: AppLayout });
