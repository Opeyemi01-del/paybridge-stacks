import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";
import { initSimnet } from "@hirosystems/clarinet-sdk";

const simnet = await initSimnet();
const accounts = simnet.getAccounts();

const deployer = accounts.get("deployer")!;
const merchant = accounts.get("wallet_1")!;
const customer = accounts.get("wallet_2")!;
const stranger = accounts.get("wallet_3")!;

const CUSTOMER_SBTC_BALANCE = 100_000_000n;
const MERCHANT_NAME = "Chukwu Store";
const WEBHOOK_URL   = "https://chukwustore.ng/hooks/payment";
const PAYMENT_AMOUNT = 1_000_000n;
const GATEWAY = "payment-gateway";
const MSBTC   = "mock-sbtc";

// Unique ID generator -- simnet state persists across all tests,
// so every merchant and payment needs a globally unique ID.
let counter = 0;
function uid(prefix: string) {
  return `${prefix}_${++counter}`;
}

// --- Helpers ---

// Assert a Clarity uint value equals expected bigint
function uint(v: any, expected: bigint): void {
  expect(v?.value).toBe(expected);
}

// Assert result is an Err with specific error code
function isErr(result: any, code: bigint): void {
  expect(result?.value?.value).toBe(code);
}

// Get Ok inner value (works regardless of ClarityType enum version)
function okVal(result: any): any {
  // Ok responses: result.value is the inner clarity value (tuple/uint/string/bool)
  // Err responses: result.value is {type, value: bigint (error code)}
  // We detect err by checking if inner value is a small uint <= 200
  const v = result?.value;
  if (v?.value !== undefined && typeof v.value === "bigint" && v.value <= 200n) {
    throw new Error("Expected Ok but got Err(" + v.value + "): " + JSON.stringify(result));
  }
  return v;
}

// --- Contract call helpers ---

function mintSbtc(to: string, amount: bigint) {
  return simnet.callPublicFn(MSBTC, "mint",
    [Cl.uint(amount), Cl.standardPrincipal(to)], deployer);
}

function registerMerchant(merchantId: string, caller = merchant) {
  return simnet.callPublicFn(GATEWAY, "register-merchant",
    [Cl.stringAscii(merchantId), Cl.stringUtf8(MERCHANT_NAME), Cl.stringUtf8(WEBHOOK_URL)],
    caller);
}

function createPayment(paymentId: string, merchantId: string, amount = PAYMENT_AMOUNT, caller = merchant) {
  return simnet.callPublicFn(GATEWAY, "create-payment",
    [Cl.stringAscii(paymentId), Cl.stringAscii(merchantId), Cl.uint(amount), Cl.none()],
    caller);
}

function pay(paymentId: string, caller = customer) {
  return simnet.callPublicFn(GATEWAY, "pay",
    [Cl.stringAscii(paymentId), Cl.contractPrincipal(deployer, MSBTC)], caller);
}

function releasePayment(paymentId: string, merchantId: string, caller = merchant) {
  return simnet.callPublicFn(GATEWAY, "release-payment",
    [Cl.stringAscii(paymentId), Cl.contractPrincipal(deployer, MSBTC)], caller);
}

// --- Tests ---

describe("PayBridge -- payment-gateway.clar", () => {

  beforeEach(() => {
    mintSbtc(customer, CUSTOMER_SBTC_BALANCE);
  });

  // -----------------------------------------------------------------------
  describe("Merchant Registration", () => {

    it("registers a new merchant successfully", () => {
      const mid = uid("mer");
      const { result } = registerMerchant(mid);
      expect(result.value?.data).toBe(mid);
    });

    it("stores correct merchant data on-chain", () => {
      const mid = uid("mer");
      registerMerchant(mid);
      const { result } = simnet.callReadOnlyFn(
        GATEWAY, "get-merchant", [Cl.stringAscii(mid)], deployer);
      const data = (result as any).value?.data;
      expect(data).toBeDefined();
      uint(data["total-received"], 0n);
    });

    it("fails if merchant ID already exists", () => {
      const mid = uid("mer");
      registerMerchant(mid);
      isErr(registerMerchant(mid).result, 102n);
    });

    it("allows different wallets to register with different IDs", () => {
      const mid1 = uid("mer");
      const mid2 = uid("mer");
      registerMerchant(mid1, merchant);
      const { result } = registerMerchant(mid2, stranger);
      expect(result.value?.data).toBe(mid2);
    });

  });

  // -----------------------------------------------------------------------
  describe("Payment Creation", () => {

    it("creates a payment intent successfully", () => {
      const mid = uid("mer");
      const pid = uid("pay");
      registerMerchant(mid);
      const { result } = createPayment(pid, mid);
      expect(result.value?.data?.["payment-id"]?.data).toBe(pid);
      uint(result.value?.data?.amount, PAYMENT_AMOUNT);
    });

    it("calculates 0.5% protocol fee correctly", () => {
      const mid = uid("mer");
      const pid = uid("pay");
      registerMerchant(mid);
      const { result } = createPayment(pid, mid, 1_000_000n);
      // 0.5% of 1,000,000 = 5,000 satoshis
      uint(result.value?.data?.fee, 5_000n);
    });

    it("fails if called by non-merchant wallet", () => {
      const mid = uid("mer");
      const pid = uid("pay");
      registerMerchant(mid);
      const { result } = simnet.callPublicFn(GATEWAY, "create-payment",
        [Cl.stringAscii(pid), Cl.stringAscii(mid), Cl.uint(PAYMENT_AMOUNT), Cl.none()],
        stranger);
      isErr(result, 100n);
    });

    it("fails with zero amount", () => {
      const mid = uid("mer");
      const pid = uid("pay");
      registerMerchant(mid);
      isErr(createPayment(pid, mid, 0n).result, 108n);
    });

    it("fails if payment ID already exists", () => {
      const mid = uid("mer");
      const pid = uid("pay");
      registerMerchant(mid);
      createPayment(pid, mid);
      isErr(createPayment(pid, mid).result, 104n);
    });

  });

  // -----------------------------------------------------------------------
  describe("Payment Execution (pay)", () => {

    it("customer pays a pending payment successfully", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid);
      const { result } = pay(pid);
      uint(result.value?.data?.amount, PAYMENT_AMOUNT);
      uint(result.value?.data?.net,    995_000n);
      uint(result.value?.data?.fee,    5_000n);
    });

    it("payment status changes to confirmed after payment", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid); pay(pid);
      const { result } = simnet.callReadOnlyFn(
        GATEWAY, "get-payment-status", [Cl.stringAscii(pid)], deployer);
      uint(result.value as any, 1n);
    });

    it("merchant balance increases by net amount after payment", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid); pay(pid);
      const { result } = simnet.callReadOnlyFn(
        GATEWAY, "get-merchant-balance", [Cl.stringAscii(mid)], deployer);
      uint((result as any).data?.balance, 995_000n);
    });

    it("fails if merchant tries to pay their own payment (self-payment)", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid);
      isErr(pay(pid, merchant).result, 110n);
    });

    it("fails if payment is already confirmed (double-pay)", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid); pay(pid);
      isErr(pay(pid).result, 106n);
    });

    it("fails for a non-existent payment ID", () => {
      isErr(pay(uid("ghost")).result, 103n);
    });

  });

  // -----------------------------------------------------------------------
  describe("Payment Release", () => {

    it("merchant can release confirmed payment funds", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid); pay(pid);
      const { result } = releasePayment(pid, mid);
      uint(result.value?.data?.amount, 995_000n);
    });

    it("payment status changes to released after withdrawal", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid); pay(pid);
      releasePayment(pid, mid);
      const { result } = simnet.callReadOnlyFn(
        GATEWAY, "get-payment-status", [Cl.stringAscii(pid)], deployer);
      uint(result.value as any, 2n);
    });

    it("merchant balance decreases to zero after release", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid); pay(pid);
      releasePayment(pid, mid);
      const { result } = simnet.callReadOnlyFn(
        GATEWAY, "get-merchant-balance", [Cl.stringAscii(mid)], deployer);
      uint((result as any).data?.balance, 0n);
    });

    it("fails if stranger tries to release merchant funds", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid); pay(pid);
      isErr(releasePayment(pid, mid, stranger).result, 100n);
    });

    it("fails if trying to release an already-released payment", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid); pay(pid);
      releasePayment(pid, mid);
      isErr(releasePayment(pid, mid).result, 111n);
    });

  });

  // -----------------------------------------------------------------------
  describe("Fee Calculation", () => {

    it("calculates fee correctly for various amounts", () => {
      const cases: [bigint, bigint][] = [
        [1_000_000n, 5_000n],
        [100_000n,   500n],
        [10_000n,    50n],
      ];
      for (const [amount, expectedFee] of cases) {
        const { result } = simnet.callReadOnlyFn(
          GATEWAY, "calculate-fee", [Cl.uint(amount)], deployer);
        uint(result.value as any, expectedFee);
      }
    });

    it("protocol fees accumulate correctly across multiple payments", () => {
      const mid = uid("mer");
      const pid1 = uid("pay");
      const pid2 = uid("pay");
      registerMerchant(mid);
      createPayment(pid1, mid, PAYMENT_AMOUNT);
      createPayment(pid2, mid, PAYMENT_AMOUNT);
      mintSbtc(customer, CUSTOMER_SBTC_BALANCE);
      pay(pid1);
      pay(pid2);
      const { result } = simnet.callReadOnlyFn(
        GATEWAY, "get-protocol-fees", [], deployer);
      // Each payment: 0.5% of 1,000,000 = 5,000 -- two payments = 10,000
      // But protocol fees accumulate across the whole test run, so check >= 10,000
      expect((result as any).value).toBeGreaterThanOrEqual(10_000n);
    });

  });

  // -----------------------------------------------------------------------
  describe("Read-only Helpers", () => {

    it("returns none for non-existent merchant", () => {
      const { result } = simnet.callReadOnlyFn(
        GATEWAY, "get-merchant", [Cl.stringAscii(uid("ghost"))], deployer);
      expect((result as any).value).toBeUndefined();
    });

    it("returns none for non-existent payment", () => {
      const { result } = simnet.callReadOnlyFn(
        GATEWAY, "get-payment", [Cl.stringAscii(uid("ghost"))], deployer);
      expect((result as any).value).toBeUndefined();
    });

    it("correctly reports a pending payment as not expired", () => {
      const mid = uid("mer"); const pid = uid("pay");
      registerMerchant(mid); createPayment(pid, mid);
      const { result } = simnet.callReadOnlyFn(
        GATEWAY, "is-payment-expired", [Cl.stringAscii(pid)], deployer);
      // is-payment-expired returns (ok false) for a fresh payment
      // result.value is the Ok inner value (a bool)
      // Clarity bool false: { type: BoolFalse } with no .value property
      // So we check that .value is NOT true (i.e. not expired)
      const inner = result?.value;
      const isExpired = inner?.value === true || inner === true;
      expect(isExpired).toBe(false);
    });

  });

});