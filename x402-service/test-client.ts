import "dotenv/config";

import algosdk from "algosdk";

import { x402Client } from "@x402/core/client";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { toClientAvmSigner } from "@x402/avm";
import { wrapFetchWithPayment } from "@x402/fetch";


// ============================================================
// CONFIG
// ============================================================

const X402_URL =
    "http://localhost:4021/api/premium/productivity-report";

// Full Algorand Testnet CAIP-2.
// Do NOT use the potentially truncated package constant.
const ALGORAND_TESTNET_CAIP2 =
    "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";


// ============================================================
// CREATE SIGNER
// ============================================================

function createSigner() {

    const mnemonic = process.env.AVM_MNEMONIC;

    if (!mnemonic) {
        throw new Error(
            "AVM_MNEMONIC is missing from .env"
        );
    }

    const account =
        algosdk.mnemonicToSecretKey(mnemonic);

    const privateKey =
        Buffer.from(account.sk).toString("base64");

    return toClientAvmSigner(privateKey);
}


// ============================================================
// MAIN
// ============================================================

async function main() {

    console.log("🔐 Loading wallet...");

    const signer = createSigner();

    console.log(
        "💳 Payer address:",
        signer.address
    );


    // ========================================================
    // CREATE x402 CLIENT
    // ========================================================

    const client = new x402Client();


    client.register(
        ALGORAND_TESTNET_CAIP2,
        new ExactAvmScheme(signer)
    );


    console.log(
        "✅ Algorand Testnet scheme registered"
    );

    console.log(
        "🌐 Network:",
        ALGORAND_TESTNET_CAIP2
    );


    // ========================================================
    // WRAP FETCH WITH x402 PAYMENT
    // ========================================================

    const fetchWithPayment =
        wrapFetchWithPayment(
            fetch,
            client
        );


    console.log(
        "💰 Requesting premium report..."
    );


    try {

        const response =
            await fetchWithPayment(
                X402_URL,
                {
                    method: "GET"
                }
            );


        console.log(
            "📡 Final HTTP Status:",
            response.status
        );


        // ====================================================
        // DEBUG RESPONSE HEADERS
        // ====================================================

        console.log(
            "\n📋 Response Headers:"
        );

        for (
            const [key, value]
            of response.headers.entries()
        ) {
            console.log(
                `${key}: ${value}`
            );
        }


        // ====================================================
        // RESPONSE BODY
        // ====================================================

        const responseText =
            await response.text();

        console.log(
            "\n📦 Server Response:"
        );

        console.log(
            responseText
        );


        // ====================================================
        // RESULT
        // ====================================================

        if (response.ok) {

            console.log(
                "\n🎉 PAYMENT SUCCESSFUL!"
            );

            console.log(
                "⛓️ Algorand Testnet x402 flow completed."
            );

        } else {

            console.log(
                "\n❌ Payment/request failed."
            );

        }

    } catch (error) {

        console.error(
            "\n❌ ERROR:"
        );

        console.error(error);

    }
}


// ============================================================
// RUN
// ============================================================

main();