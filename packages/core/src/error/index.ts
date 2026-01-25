export type { BaseErrorCode } from "./codes";
export { BASE_ERROR_CODES, defineErrorCodes } from "./codes";

/**
 * HTTP status codes
 */
export type HttpStatus =
  | 200
  | 201
  | 204
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 500;

/**
 * BillingError - Error class for BillSDK
 *
 * @example
 * ```typescript
 * import { BillingError } from "@billsdk/core/error";
 *
 * throw BillingError.from("NOT_FOUND", {
 *   code: "CUSTOMER_NOT_FOUND",
 *   message: "Customer not found",
 * });
 * ```
 */
export class BillingError extends Error {
  public readonly status: HttpStatus;
  public readonly code: string;

  constructor(
    status: HttpStatus,
    body?: { code?: string; message?: string } | string,
  ) {
    const message =
      typeof body === "string" ? body : (body?.message ?? "Error");
    super(message);
    this.name = "BillingError";
    this.status = status;
    this.code =
      typeof body === "object" ? (body?.code ?? "UNKNOWN") : "UNKNOWN";
  }

  static fromStatus(status: HttpStatus, message?: string) {
    return new BillingError(status, message);
  }

  static from(
    status: HttpStatus,
    error: { code: string; message: string },
  ): BillingError {
    return new BillingError(status, {
      message: error.message,
      code: error.code,
    });
  }

  static notFound(error: { code: string; message: string }): BillingError {
    return BillingError.from(404, error);
  }

  static badRequest(error: { code: string; message: string }): BillingError {
    return BillingError.from(400, error);
  }

  static unauthorized(error: { code: string; message: string }): BillingError {
    return BillingError.from(401, error);
  }

  static internal(error: { code: string; message: string }): BillingError {
    return BillingError.from(500, error);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}
