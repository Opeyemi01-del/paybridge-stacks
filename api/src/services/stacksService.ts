import { StacksMainnet, StacksTestnet } from "@stacks/network";
import {
  makeContractCall,
  broadcastTransaction,
  callReadOnlyFunction,
  cvToValue,
  stringAsciiCV,
  stringUtf8CV,
  uintCV,
  noneCV,
  contractPrincipalCV,
  AnchorMode,
} from "@stacks/transactions";

const NETWORK          = process.env.STACKS_NETWORK   ?? "devnet";
const API_URL          = process.env.STACKS_API_URL   ?? "http://localhost:3999";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS ?? "";
const GATEWAY_CONTRACT = "payment-gateway";
const SBTC_CONTRACT    = "mock-sbtc";

function getNetwork() {
  if (NETWORK === "mainnet") return new StacksMainnet({ url: API_URL });
  return new StacksTestnet({ url: API_URL });
}

// ── Read-only calls ────────────────────────────────────────────────────────

export async function getPaymentOnChain(paymentId: string) {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName:    GATEWAY_CONTRACT,
    functionName:    "get-payment",
    functionArgs:    [stringAsciiCV(paymentId)],
    network:         getNetwork(),
    senderAddress:   CONTRACT_ADDRESS,
  });
  return cvToValue(result, true);
}

export async function getMerchantOnChain(merchantId: string) {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName:    GATEWAY_CONTRACT,
    functionName:    "get-merchant",
    functionArgs:    [stringAsciiCV(merchantId)],
    network:         getNetwork(),
    senderAddress:   CONTRACT_ADDRESS,
  });
  return cvToValue(result, true);
}

export async function getPaymentStatusOnChain(paymentId: string) {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName:    GATEWAY_CONTRACT,
    functionName:    "get-payment-status",
    functionArgs:    [stringAsciiCV(paymentId)],
    network:         getNetwork(),
    senderAddress:   CONTRACT_ADDRESS,
  });
  return cvToValue(result, true);
}

export async function calculateFeeOnChain(amount: number) {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName:    GATEWAY_CONTRACT,
    functionName:    "calculate-fee",
    functionArgs:    [uintCV(amount)],
    network:         getNetwork(),
    senderAddress:   CONTRACT_ADDRESS,
  });
  return cvToValue(result, true);
}

// ── Write calls ────────────────────────────────────────────────────────────

export async function registerMerchantOnChain(
  merchantId: string,
  name: string,
  webhookUrl: string,
  senderKey: string
) {
  const network = getNetwork();
  const tx = await makeContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName:    GATEWAY_CONTRACT,
    functionName:    "register-merchant",
    functionArgs:    [
      stringAsciiCV(merchantId),
      stringUtf8CV(name),
      stringUtf8CV(webhookUrl),
    ],
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
    fee:        2000,
  });
  // v6.x: broadcastTransaction(tx, network) -- positional, not object
  return broadcastTransaction(tx, network);
}

export async function createPaymentOnChain(
  paymentId: string,
  merchantId: string,
  amount: number,
  senderKey: string
) {
  const network = getNetwork();
  const tx = await makeContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName:    GATEWAY_CONTRACT,
    functionName:    "create-payment",
    functionArgs:    [
      stringAsciiCV(paymentId),
      stringAsciiCV(merchantId),
      uintCV(amount),
      noneCV(),
    ],
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
    fee:        2000,
  });
  return broadcastTransaction(tx, network);
}

export async function releasePaymentOnChain(
  paymentId: string,
  senderKey: string
) {
  const network = getNetwork();
  const tx = await makeContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName:    GATEWAY_CONTRACT,
    functionName:    "release-payment",
    functionArgs:    [
      stringAsciiCV(paymentId),
      contractPrincipalCV(CONTRACT_ADDRESS, SBTC_CONTRACT),
    ],
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
    fee:        2000,
  });
  return broadcastTransaction(tx, network);
}

export const STATUS_MAP: Record<number, string> = {
  0: "pending",
  1: "confirmed",
  2: "released",
  3: "refunded",
  4: "expired",
};