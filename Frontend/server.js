/* =========================================================
   BETTER THAN YESTERDAY — FRONTEND HOST (deployment only)
   ---------------------------------------------------------
   Serves the existing static site on the port provided by
   the hosting platform. No application logic lives here.
========================================================= */

const express = require("express");
const path = require("path");

const app = express();

const PORT =
    Number(process.env.PORT || 3000);

app.use(
    express.static(__dirname)
);

app.listen(
    PORT,
    () => {
        console.log(
            `🚀 Better Than Yesterday frontend ready on port ${PORT}`
        );
    }
);