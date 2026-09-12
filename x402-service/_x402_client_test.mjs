/*
 * Headless verification of the FIXED dashboard.js x402 client construction.
 * Uses the real live 402 PAYMENT-REQUIRED header and the same
 * @x402/core 2.25.0 / @x402/avm 2.25.0 versions the browser loads via esm.sh.
 * The signer mock implements exactly the Pera signer interface used by
 * createPremiumPeraSigner() — reaching signTransactions proves Pera would be
 * invoked. No payment is faked or settled; no keys are used.
 */
import { x402Client } from "@x402/core/client";
import { ExactAvmScheme } from "@x402/avm/exact/client";

const ALGORAND_TESTNET_CAIP2 =
    "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

const PREMIUM_URL =
    "https://better-than-yesterday-production.up.railway.app/api/premium/productivity-report";

const PERA_ADDRESS =
    "V5C442LGGVAEFVQYNQHVCIDN5EU4JWOOL4WG6H2NQP5ZGHGTRODRRLN2BI";

let peraSigningInvoked = false;

/* Mock of the Pera signer interface built by createPremiumPeraSigner() */
const signer = {
    address: PERA_ADDRESS,

    async signTransactions(txns, indexesToSign) {
        peraSigningInvoked = true;
        console.log("🔐 SIGNER INVOKED (Pera would open signing request)");
        console.log("   transactions:", Array.isArray(txns) ? txns.length : 0);
        console.log("   indexes to sign:", indexesToSign);

        /* Pass-through return shape identical to the dashboard signer */
        return txns.map((_, index) =>
            !indexesToSign || indexesToSign.includes(index) ? txns[index] : null
        );
    }
};

/* 1. Fetch the live 402 and extract the real payment requirements */
console.log("1. Fetching live protected endpoint...");
const res = await fetch(PREMIUM_URL);
console.log("   status:", res.status);
if (res.status !== 402) {
    console.error("   FAIL: expected 402, got", res.status);
    process.exit(1);
}
const requiredHeader = res.headers.get("payment-required");
if (!requiredHeader) {
    console.error("   FAIL: no PAYMENT-REQUIRED header");
    process.exit(1);
}
console.log("   PAYMENT-REQUIRED header present: true");
const paymentRequired = JSON.parse(
    Buffer.from(requiredHeader, "base64").toString("utf8")
);
console.log("   decoded x402Version:", paymentRequired.x402Version);
console.log("   accepts[0].network:", paymentRequired.accepts[0].network);
console.log("   accepts[0].scheme:", paymentRequired.accepts[0].scheme);
console.log("   accepts[0].amount:", paymentRequired.accepts[0].amount);

/* 2. Construct the client EXACTLY like the fixed dashboard.js */
console.log("2. Constructing x402Client via fromConfig (fixed code path)...");
const client = x402Client.fromConfig({
    schemes: [
        {
            network: ALGORAND_TESTNET_CAIP2,
            client: new ExactAvmScheme(signer)
        }
    ],
    paymentRequirementsSelector:
        (_version, reqs) =>
            reqs.find(
                (a) =>
                    a.network === ALGORAND_TESTNET_CAIP2 &&
                    a.scheme === "exact"
            ) ?? reqs[0]
});
console.log("   client constructed OK (no selector crash)");

/* 3. Create the payment payload from the live 402 requirements */
console.log("3. Creating payment payload from live 402...");
const payload = await client.createPaymentPayload(paymentRequired);
console.log("   payment payload created:", !!payload);
const payloadStr = JSON.stringify(payload);
console.log("   payload has scheme exact:", payloadStr.includes("exact"));
console.log("   payload references signer addr:", payloadStr.includes(PERA_ADDRESS));

/* 4. Signing invocation check */
console.log("4. Pera signing step reached:", peraSigningInvoked);

const ok =
    res.status === 402 &&
    !!payload &&
    peraSigningInvoked;

console.log(ok ? "\n✅ ALL CHECKS PASSED" : "\n❌ CHECKS FAILED");
process.exit(ok ? 0 : 1);
