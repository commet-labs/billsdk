import { billing } from "@/lib/billing";

/**
 * BillSDK API route handler
 * Handles all /api/billing/* requests
 */
export const GET = billing.handler;
export const POST = billing.handler;
