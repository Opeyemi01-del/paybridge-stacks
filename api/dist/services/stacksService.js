"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_MAP = void 0;
exports.getPaymentOnChain = getPaymentOnChain;
exports.getMerchantOnChain = getMerchantOnChain;
exports.getPaymentStatusOnChain = getPaymentStatusOnChain;
exports.calculateFeeOnChain = calculateFeeOnChain;
exports.registerMerchantOnChain = registerMerchantOnChain;
exports.createPaymentOnChain = createPaymentOnChain;
exports.releasePaymentOnChain = releasePaymentOnChain;
const network_1 = require("@stacks/network");
const transactions_1 = require("@stacks/transactions");
const NETWORK = process.env.STACKS_NETWORK ?? "devnet";
const API_URL = process.env.STACKS_API_URL ?? "http://localhost:3999";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS ?? "";
const GATEWAY_CONTRACT = "payment-gateway";
const SBTC_CONTRACT = "mock-sbtc";
function getNetwork() {
    if (NETWORK === "mainnet")
        return new network_1.StacksMainnet({ url: API_URL });
    return new network_1.StacksTestnet({ url: API_URL });
}
async function getPaymentOnChain(paymentId) {
    const result = await (0, transactions_1.callReadOnlyFunction)({
        contractAddress: CONTRACT_ADDRESS, contractName: GATEWAY_CONTRACT,
        functionName: "get-payment", functionArgs: [(0, transactions_1.stringAsciiCV)(paymentId)],
        network: getNetwork(), senderAddress: CONTRACT_ADDRESS,
    });
    return (0, transactions_1.cvToValue)(result, true);
}
async function getMerchantOnChain(merchantId) {
    const result = await (0, transactions_1.callReadOnlyFunction)({
        contractAddress: CONTRACT_ADDRESS, contractName: GATEWAY_CONTRACT,
        functionName: "get-merchant", functionArgs: [(0, transactions_1.stringAsciiCV)(merchantId)],
        network: getNetwork(), senderAddress: CONTRACT_ADDRESS,
    });
    return (0, transactions_1.cvToValue)(result, true);
}
async function getPaymentStatusOnChain(paymentId) {
    const result = await (0, transactions_1.callReadOnlyFunction)({
        contractAddress: CONTRACT_ADDRESS, contractName: GATEWAY_CONTRACT,
        functionName: "get-payment-status", functionArgs: [(0, transactions_1.stringAsciiCV)(paymentId)],
        network: getNetwork(), senderAddress: CONTRACT_ADDRESS,
    });
    return (0, transactions_1.cvToValue)(result, true);
}
async function calculateFeeOnChain(amount) {
    const result = await (0, transactions_1.callReadOnlyFunction)({
        contractAddress: CONTRACT_ADDRESS, contractName: GATEWAY_CONTRACT,
        functionName: "calculate-fee", functionArgs: [(0, transactions_1.uintCV)(amount)],
        network: getNetwork(), senderAddress: CONTRACT_ADDRESS,
    });
    return (0, transactions_1.cvToValue)(result, true);
}
async function registerMerchantOnChain(merchantId, name, webhookUrl, senderKey) {
    const network = getNetwork();
    const tx = await (0, transactions_1.makeContractCall)({
        contractAddress: CONTRACT_ADDRESS, contractName: GATEWAY_CONTRACT,
        functionName: "register-merchant",
        functionArgs: [(0, transactions_1.stringAsciiCV)(merchantId), (0, transactions_1.stringUtf8CV)(name), (0, transactions_1.stringUtf8CV)(webhookUrl)],
        senderKey, network, anchorMode: transactions_1.AnchorMode.Any, fee: 2000,
    });
    return (0, transactions_1.broadcastTransaction)(tx, network);
}
async function createPaymentOnChain(paymentId, merchantId, amount, senderKey) {
    const network = getNetwork();
    const tx = await (0, transactions_1.makeContractCall)({
        contractAddress: CONTRACT_ADDRESS, contractName: GATEWAY_CONTRACT,
        functionName: "create-payment",
        functionArgs: [(0, transactions_1.stringAsciiCV)(paymentId), (0, transactions_1.stringAsciiCV)(merchantId), (0, transactions_1.uintCV)(amount), (0, transactions_1.noneCV)()],
        senderKey, network, anchorMode: transactions_1.AnchorMode.Any, fee: 2000,
    });
    return (0, transactions_1.broadcastTransaction)(tx, network);
}
async function releasePaymentOnChain(paymentId, senderKey) {
    const network = getNetwork();
    const tx = await (0, transactions_1.makeContractCall)({
        contractAddress: CONTRACT_ADDRESS, contractName: GATEWAY_CONTRACT,
        functionName: "release-payment",
        functionArgs: [(0, transactions_1.stringAsciiCV)(paymentId), (0, transactions_1.contractPrincipalCV)(CONTRACT_ADDRESS, SBTC_CONTRACT)],
        senderKey, network, anchorMode: transactions_1.AnchorMode.Any, fee: 2000,
    });
    return (0, transactions_1.broadcastTransaction)(tx, network);
}
exports.STATUS_MAP = {
    0: "pending", 1: "confirmed", 2: "released", 3: "refunded", 4: "expired",
};
