// types/api.ts
import type { NextApiRequest, NextApiResponse } from "next";

// Generic API response envelope
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string };
export type ApiResp<T> = ApiOk<T> | ApiErr;

// Pagination helper if you use it
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

// Narrowed request helpers
export type ReqWithBody<T> = NextApiRequest & { body: T };
export type ReqWithQuery<T extends Record<string, string | string[] | undefined>> =
  NextApiRequest & { query: T };
