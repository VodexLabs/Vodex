/**
 * Next.js Middleware entry point.
 *
 * All logic lives in proxy.ts — this file exists only because Next.js requires
 * the default export to be named `middleware` and the file must be at
 * src/middleware.ts (or root middleware.ts).
 */

export { proxy as middleware, config } from "@/proxy";
