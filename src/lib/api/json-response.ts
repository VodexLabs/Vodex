import { NextResponse } from "next/server";

export type ApiErrorBody = {
  ok: false;
  error: { code: string; message: string; hint?: string };
};

export type ApiOkBody<T extends Record<string, unknown>> = { ok: true } & T;

export function jsonOk<T extends Record<string, unknown>>(
  data: T,
  init?: ResponseInit,
): NextResponse {
  return NextResponse.json({ ok: true, ...data } satisfies ApiOkBody<T>, init);
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  hint?: string,
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, ...(hint ? { hint } : {}) },
    } satisfies ApiErrorBody,
    { status },
  );
}
