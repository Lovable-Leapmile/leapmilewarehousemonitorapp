import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { fetchWithRetry, UpstreamUnavailableError } from "./request.ts";

const ALLOWED_FILTERS = new Set([
  "tray_status",
  "status",
  "list_status",
  "order_by_field",
  "order_by_type",
]);

const QuerySchema = z.record(z.string());
const FeedNameSchema = z.enum(["inProgress", "ready", "pickReady"]);
const BodySchema = z.object({
  query: QuerySchema.optional(),
  queries: z.record(FeedNameSchema, QuerySchema).optional(),
}).refine((body) => body.query !== undefined || body.queries !== undefined, {
  message: "A query or queries object is required",
});

function buildUpstreamUrl(query: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (ALLOWED_FILTERS.has(key)) params.set(key, value);
  }
  return `https://testrobot1.leapmile.com/nanostore/orders?${params.toString()}`;
}

async function fetchOrders(query: Record<string, string>, token: string) {
  try {
    const response = await fetchWithRetry(buildUpstreamUrl(query), {
      headers: { accept: "application/json", Authorization: `Bearer ${token}` },
    });

    // Leapmile uses 404 to mean that this valid filter currently has no rows.
    if (response.status === 404) {
      return { status: "success", status_code: 200, count: 0, records: [] };
    }

    const contentType = response.headers.get("content-type") ?? "application/json";
    if (!contentType.includes("application/json")) {
      return { status: "failure", status_code: response.status, records: [] };
    }
    return await response.json();
  } catch (error) {
    if (error instanceof UpstreamUnavailableError) {
      return {
        status: "degraded",
        status_code: 200,
        count: 0,
        records: [],
        unavailable: true,
      };
    }
    throw error;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid order query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("LEAPMILE_API_TOKEN");
    if (!token) throw new Error("LEAPMILE_API_TOKEN is not configured");

    if (parsed.data.queries) {
      const entries = Object.entries(parsed.data.queries);
      const results = await Promise.all(
        entries.map(async ([name, query]) => [name, await fetchOrders(query, token)] as const),
      );
      return new Response(JSON.stringify({ feeds: Object.fromEntries(results) }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    const payload = await fetchOrders(parsed.data.query ?? {}, token);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const unavailable = error instanceof UpstreamUnavailableError;

    // A temporary upstream outage is a valid polling state, not a function
    // failure. Returning 200 lets the client retain its last successful feed
    // without the platform reporting a runtime error or blanking the board.
    if (unavailable) {
      return new Response(JSON.stringify({
        status: "degraded",
        status_code: 200,
        count: 0,
        records: [],
        unavailable: true,
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    return new Response(JSON.stringify({
      error: "Request failed",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});