import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

import {
    paymentMiddleware,
    x402ResourceServer
} from "@x402/express";

import {
    HTTPFacilitatorClient
} from "@x402/core/server";

import type {
    RoutesConfig
} from "@x402/core/server";

import {
    ExactAvmScheme
} from "@x402/avm/exact/server";

import {
    USDC_TESTNET_ASA_ID
} from "@x402/avm";


/*
|--------------------------------------------------------------------------
| Load x402-service/.env
|--------------------------------------------------------------------------
*/

const ENV_PATH = fileURLToPath(
    new URL("../.env", import.meta.url)
);

dotenv.config({
    path: ENV_PATH
});


/*
|--------------------------------------------------------------------------
| Algorand TestNet
|--------------------------------------------------------------------------
*/

const ALGORAND_TESTNET_CAIP2 =
    "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";


/*
|--------------------------------------------------------------------------
| Express App
|--------------------------------------------------------------------------
*/

const app = express();

/*
|--------------------------------------------------------------------------
| Trust the reverse proxy (Railway / Render / Nginx)
|
| The platform terminates TLS upstream, so Express must trust the proxy
| to report the real protocol in req.protocol (used to build the x402
| payment resource URL). Without this, the generated resource URL would
| be http:// instead of https://.
|--------------------------------------------------------------------------
*/

app.set("trust proxy", true);

/*
 * CORS
 *
 * Must run BEFORE x402 paymentMiddleware so browser preflight requests
 * and x402 402/200 responses receive the required CORS headers.
 *
 * The current frontend/x402 client requests Access-Control-Expose-Headers
 * during preflight, so it is explicitly allowed for compatibility.
 */
app.use(
    cors({
        origin: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "PAYMENT-SIGNATURE",
            "X-PAYMENT",
            "Access-Control-Expose-Headers"
        ],
        exposedHeaders: [
            "PAYMENT-REQUIRED",
            "PAYMENT-RESPONSE"
        ],
        optionsSuccessStatus: 204
    })
);

app.use(express.json());


/*
|--------------------------------------------------------------------------
| Environment Variables
|--------------------------------------------------------------------------
*/

const PORT =
    Number(process.env.PORT || 4021);

const PAY_TO =
    process.env.RESOURCE_PAY_TO;

const FACILITATOR_URL =
    process.env.FACILITATOR_URL ||
    "https://facilitator.goplausible.xyz";

const DJANGO_API_URL =
    (process.env.DJANGO_API_URL || "").replace(/\/$/, "");


/*
|--------------------------------------------------------------------------
| Configuration Check
|--------------------------------------------------------------------------
*/

console.log("");
console.log("==========================================");
console.log("🔧 Better Than Yesterday x402");
console.log("==========================================");

console.log(
    "📄 ENV file:",
    ENV_PATH
);

console.log(
    "💰 PAY_TO:",
    PAY_TO
);

console.log(
    "💵 USDC ASA:",
    USDC_TESTNET_ASA_ID
);

console.log(
    "⛓️ Network:",
    ALGORAND_TESTNET_CAIP2
);

console.log(
    "🤝 Facilitator:",
    FACILITATOR_URL
);

console.log("==========================================");
console.log("");


/*
|--------------------------------------------------------------------------
| Validate PAY_TO
|--------------------------------------------------------------------------
*/

if (!PAY_TO) {

    console.error(
        "❌ RESOURCE_PAY_TO is missing in .env"
    );

    process.exit(1);
}


/*
|--------------------------------------------------------------------------
| GoPlausible Facilitator
|--------------------------------------------------------------------------
*/

const facilitatorClient =
    new HTTPFacilitatorClient({
        url: FACILITATOR_URL
    });


/*
|--------------------------------------------------------------------------
| x402 Resource Server
|--------------------------------------------------------------------------
*/

const resourceServer =
    new x402ResourceServer(
        facilitatorClient
    );


/*
|--------------------------------------------------------------------------
| Register Algorand Exact Scheme
|--------------------------------------------------------------------------
*/

resourceServer.register(
    ALGORAND_TESTNET_CAIP2,
    new ExactAvmScheme()
);


/*
|--------------------------------------------------------------------------
| Protected x402 Routes
|--------------------------------------------------------------------------
*/

const routes: RoutesConfig = {

    "GET /api/premium/productivity-report": {

        accepts: {

            scheme: "exact",

            network:
                ALGORAND_TESTNET_CAIP2,

            payTo:
                PAY_TO,

            price:
                "$0.01",

            extra: {

                asset:
                    USDC_TESTNET_ASA_ID

            }

        },

        description:
            "Premium Better Than Yesterday productivity report",

        mimeType:
            "application/json"

    }

};


/*
|--------------------------------------------------------------------------
| x402 Payment Middleware
|--------------------------------------------------------------------------
*/



app.use(
    paymentMiddleware(
        routes,
        resourceServer
    )
);


/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get(
    "/health",
    (_req, res) => {

        res.json({

            status:
                "ok",

            service:
                "Better Than Yesterday x402",

            network:
                "Algorand Testnet",

            facilitator:
                FACILITATOR_URL,

            payTo:
                PAY_TO,

            asset:
                USDC_TESTNET_ASA_ID

        });

    }
);


/*
|--------------------------------------------------------------------------
| Premium Productivity Report
|--------------------------------------------------------------------------
*/

app.get(
    "/api/premium/productivity-report",
    async (req, res) => {

        /*
         * The x402 payment middleware runs before this handler.
         * Reaching this point therefore means the payment has
         * already been accepted by the x402 facilitator.
         *
         * We now use the same JWT that the frontend supplied to
         * fetch the authenticated user's real dashboard data.
         */

        if (!DJANGO_API_URL) {
            return res.status(500).json({
                success: false,
                error: "DJANGO_API_URL is not configured."
            });
        }

        const authorization =
            req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({
                success: false,
                error: "Authorization token is required."
            });
        }

        try {
            const dashboardResponse =
                await fetch(
                    `${DJANGO_API_URL}/api/dashboard/`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: authorization,
                            Accept: "application/json"
                        }
                    }
                );

            if (!dashboardResponse.ok) {
                const errorText =
                    await dashboardResponse.text();

                console.error(
                    "❌ Django dashboard request failed:",
                    dashboardResponse.status,
                    errorText
                );

                return res.status(502).json({
                    success: false,
                    error: "Could not load your productivity data."
                });
            }

            const dashboard =
                await dashboardResponse.json();

            const totalScore =
                Number(dashboard.total_score || 0);

            const improvement =
                dashboard.improvement === null ||
                dashboard.improvement === undefined
                    ? 0
                    : Number(dashboard.improvement || 0);

            const currentStreak =
                Number(dashboard.current_streak || 0);

            const weeklyAverage =
                Number(dashboard.weekly_average || 0);

            const bestDay =
                dashboard.best_day || {};

            const worstDay =
                dashboard.worst_day || {};

            const categoryStats =
                Array.isArray(dashboard.category_stats)
                    ? dashboard.category_stats
                    : [];

            const topCategory =
                categoryStats[0]?.category || null;

            const topCategoryMinutes =
                Number(categoryStats[0]?.total_duration || 0);

            const insights = [];

            if (totalScore >= 80) {
                insights.push(
                    `You're operating at ${totalScore.toFixed(1)}/100 today — a strong productivity level.`
                );
            } else if (totalScore >= 60) {
                insights.push(
                    `You're at ${totalScore.toFixed(1)}/100 today. Your foundation is solid, but there is clear room to push higher.`
                );
            } else if (totalScore > 0) {
                insights.push(
                    `Your current score is ${totalScore.toFixed(1)}/100. The biggest opportunity is building a more consistent productive routine.`
                );
            } else {
                insights.push(
                    "No productive activity has been recorded today yet. Start with one focused task and build momentum."
                );
            }

            if (improvement > 0) {
                insights.push(
                    `You're ${improvement.toFixed(1)}% ahead of your previous-day performance — keep the momentum going.`
                );
            } else if (improvement < 0) {
                insights.push(
                    `Today's performance is ${Math.abs(improvement).toFixed(1)}% below the previous comparison. A focused recovery session can close the gap.`
                );
            } else {
                insights.push(
                    "Your recent performance is holding steady. Consistency is the next lever to improve your score."
                );
            }

            if (currentStreak >= 3) {
                insights.push(
                    `You're on a ${currentStreak}-day productive streak. Protecting this streak is your strongest short-term advantage.`
                );
            } else if (currentStreak === 1) {
                insights.push(
                    "You've started a productive streak today. Repeat tomorrow to turn a good day into a habit."
                );
            } else {
                insights.push(
                    "Your current streak is 0 days. Consistent daily activity will have the biggest impact on your long-term score."
                );
            }

            if (topCategory) {
                insights.push(
                    `${topCategory} is your strongest activity category with ${topCategoryMinutes} productive minutes recorded.`
                );
            }

            if (bestDay.score !== undefined && bestDay.date) {
                insights.push(
                    `Your best recent day scored ${Number(bestDay.score).toFixed(1)}/100 on ${bestDay.date}. Use that day as your benchmark.`
                );
            }

            return res.json({
                success: true,
                product: "Better Than Yesterday",
                payment: {
                    verified: true,
                    network: "Algorand Testnet",
                    amount: "$0.01 USDC"
                },
                report: {
                    title: "Premium Productivity Insight",
                    summary:
                        `Your personalized report is based on your Better Than Yesterday activity data. ` +
                        `Today you scored ${totalScore.toFixed(1)}/100, your 7-day average is ${weeklyAverage.toFixed(1)}, ` +
                        `and your current productive streak is ${currentStreak} day${currentStreak === 1 ? "" : "s"}.`,
                    metrics: {
                        totalScore: Number(totalScore.toFixed(1)),
                        improvement: Number(improvement.toFixed(1)),
                        currentStreak,
                        weeklyAverage: Number(weeklyAverage.toFixed(1))
                    },
                    insights: insights.slice(0, 5),
                    benchmark: {
                        bestDay: bestDay,
                        worstDay: worstDay
                    }
                }
            });

        } catch (error) {
            console.error(
                "❌ Premium report generation failed:",
                error
            );

            return res.status(502).json({
                success: false,
                error: "Premium report generation failed."
            });
        }
    }
);


/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

app.listen(
    PORT,
    () => {

        console.log("");
        console.log("==========================================");
        console.log(
            `🚀 x402 service running at http://localhost:${PORT}`
        );
        console.log("⛓️ Algorand Testnet");
        console.log(
            `💳 Payment receiver: ${PAY_TO}`
        );
        console.log(
            `🪙 Payment asset: ${USDC_TESTNET_ASA_ID}`
        );
        console.log(
            `🤝 Facilitator: ${FACILITATOR_URL}`
        );
        console.log("==========================================");
        console.log("✅ x402 service ready!");
        console.log("");

    }
);