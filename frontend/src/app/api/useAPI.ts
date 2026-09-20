import pb from "@/app/pocketbase";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * POS-0009 / POS-0011 — shared data-access layer.
 *
 * Cache strategy (see vault reference "Performance Baseline"):
 *  - reference data (areas, sections, categories, items, parties, bookers) changes
 *    rarely, so it is cached for REFERENCE_STALE_TIME (5 min).
 *  - everything else (invoices, transactions, payments, ledgers) uses the global
 *    default staleTime from providers.tsx: long enough that navigating back to a page
 *    does not re-fetch a 9k-26k row view, short enough that writes are picked up.
 *
 * NOTE on `refetchOnMount`: left at its default (true) while `staleTime` governs
 * re-fetching. The app's mutations call a bare `queryClient.invalidateQueries()`, which
 * only refreshes *active* queries; with `refetchOnMount: false` an invalidated-but-
 * inactive query would never refresh and screens could show pre-write data. Fresh data
 * within staleTime is served from cache instantly, so navigation stays instant.
 */

/** Collections that rarely change and are safe to cache aggressively. */
export const REFERENCE_COLLECTIONS = [
  "areas",
  "sections",
  "categories",
  "items",
  "parties",
  "order_bookers",
  "users",
];

/** 5 minutes — used for reference data only. */
export const REFERENCE_STALE_TIME = 5 * 60 * 1000;

export const isReferenceCollection = (collection: string) =>
  REFERENCE_COLLECTIONS.indexOf(collection) !== -1;

/** Options helper so any query can opt into the reference-data cache window. */
export const referenceQueryOptions = (collection: string) =>
  isReferenceCollection(collection) ? { staleTime: REFERENCE_STALE_TIME } : {};

export const crud = {
  create: async ({ collection, data }) => await pb.collection(collection).create(data),
  read: async ({ collection, recordID, expand = "" }) =>
    await pb.collection(collection).getOne(recordID, {
      expand: expand,
    }),
  update: async ({ collection, data, recordID }) => {
    return await pb.collection(collection).update(recordID, data);
  },
  remove: async ({ collection, recordID }) => {
    return await pb.collection(collection).delete(recordID);
  },
  listall: async ({ collection, expand = "", filter = "", sort = "-created" }) => {
    // POS bug fix: this used to drop its result (no `return`), so callers got undefined.
    return await pb.collection(collection).getFullList({
      sort: sort,
      expand: expand,
      filter: filter,
    });
  },
  /**
   * POS-0011 — real server-side pagination for transactional collections.
   * Use this instead of `getFullList` for invoices/transactions/payments.
   */
  listPage: async ({
    collection,
    page = 1,
    perPage = 50,
    sort = "-created",
    filter = "",
    expand = "",
  }) => {
    return await pb.collection(collection).getList(page, perPage, {
      sort: sort,
      filter: filter,
      expand: expand,
    });
  },
};

/////////////////////////CREATE///////////////////////////////////
export const useCreate = ({ collection, data }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => await pb.collection(collection).create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [collection] }),
  });
};
/////////////////////////READ/////////////////////////////////////
export const useRead = ({ collection, recordID, expand = "" }) => {
  return useQuery({
    queryKey: [collection, recordID],
    queryFn: async () =>
      await pb.collection(collection).getOne(recordID, {
        expand: expand,
      }),
    ...referenceQueryOptions(collection),
  });
};
/////////////////////////UPDATE///////////////////////////////////
export const useUpdate = ({ collection, data, recordID }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => await pb.collection(collection).update(recordID, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [collection] }),
  });
};
/////////////////////////DELETE///////////////////////////////////
export const useDelete = ({ collection, recordID }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => await pb.collection(collection).delete(recordID),
    onSuccess: () => qc.invalidateQueries({ queryKey: [collection] }),
  });
};
/////////////////////////FULL LIST ///////////////////////////////
/**
 * Kept for small, cached reference data only (areas, sections, categories, items,
 * parties, bookers). Do NOT use it for invoices/transactions/payments — use
 * `usePagedList` instead.
 */
export function useFullList({
  collection,
  expand = "",
  filter = "",
  sort = "-created",
  queryKey = collection,
}) {
  return useQuery({
    queryKey: [queryKey, expand, filter],
    queryFn: async () =>
      await pb.collection(collection).getFullList({
        sort: sort,
        expand: expand,
        filter: filter,
      }),
    ...referenceQueryOptions(collection),
  });
}

/////////////////////////PAGED LIST //////////////////////////////
/**
 * POS-0011 — paginated list of a transactional collection.
 *
 * Returns the raw PocketBase list response plus convenience fields, so it can be
 * fed straight into `mantine-datatable` (records / totalRecords / page).
 */
export function usePagedList({
  collection,
  page = 1,
  perPage = 50,
  sort = "-created",
  filter = "",
  expand = "",
  queryKey = collection,
  enabled = true,
}) {
  const query = useQuery({
    queryKey: [queryKey, "page", page, perPage, sort, filter, expand],
    queryFn: () =>
      pb.collection(collection).getList(page, perPage, {
        sort: sort,
        filter: filter,
        expand: expand,
      }),
    // Keep the previous page visible while the next one loads (no flicker).
    placeholderData: keepPreviousData,
    enabled: enabled,
  });

  // NOTE: `refetchOnMount` is governed by the default staleTime in providers.tsx, not by
  // the explicit false setting the app used for every query before POS-0009. Letting it fold
  // in means a page that leaves the cache window re-fetches (correct after a write); inside
  // staleTime it serves from cache and never cancels the in-flight request. If you instead
  // want stale-time-backed pages to *not* re-fetch on mount, set refetchOnMount: false
  // **and** ensure mutations invalidate by [collection] key so QueryClient.invalidateQueries
  // actually finds the active query. The app currently calls bare
  // `queryClient.invalidateQueries()` (no key) plus bare `invalidateQueries(collection)` in
  // some mutation onSuccess handlers; under v5 `invalidateQueries(string)` is treated as an
  // exact query-key match and will not match `[queryKey, "page", ...]`, so stale data would
  // survive. Until that is fixed globally (see POS-0009), do not change the default here.

  return {
    ...query,
    records: query.data?.items ?? [],
    totalRecords: query.data?.totalItems ?? 0,
    totalPages: query.data?.totalPages ?? 0,
    page: query.data?.page ?? page,
    perPage: query.data?.perPage ?? perPage,
  };
}

export default function useCRUD() {
  return {
    create: useCreate,
    read: useRead,
    update: useUpdate,
    remove: useDelete,
    fullList: useFullList,
    pagedList: usePagedList,
  };
}
