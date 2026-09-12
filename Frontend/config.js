/* =========================================================
   BETTER THAN YESTERDAY — CONFIG
   ---------------------------------------------------------
   Single source of truth for the service URLs.

   - Local development  -> falls back to 127.0.0.1
   - Production host    -> uses the live URLs below

   The production values are set when the app is deployed.
========================================================= */

(function () {

    const host =
        window.location.hostname || "";

    const isLocal =
        host === "" ||
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".local") ||
        host.startsWith("192.168.") ||
        host.startsWith("10.");

    window.BTY_CONFIG = {

        /*
            Django REST API (register / token / dashboard).
            Live on Railway.
        */
        API_BASE: isLocal
            ? "http://127.0.0.1:8000"
            : "https://django-api-production-e0de.up.railway.app",

        /* x402 payment service (live on Railway) */
        X402_BASE: isLocal
            ? "http://127.0.0.1:4021"
            : "https://better-than-yesterday-production.up.railway.app"

    };

})();