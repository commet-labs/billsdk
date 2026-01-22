import { bill } from "@/lib/billing";

/**
 * BillSDK API route handler
 * Handles all /api/billing/* requests
 */
export const GET = bill.handler;
export const POST = bill.handler;
