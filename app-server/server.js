const fastify = require("fastify")({
  logger: true,
});
const path = require("path");
const moment = require("moment");
const util = require("util");

const port = process.env.PORT || 3000;

// Serve static files
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/public/",
});

/**
 *
 * Our Homepage
 *
 */
fastify.get("/", async (request, reply) => {
  const date = moment().format("MMM Do");
  const year = moment().format("YYYY");
  const serverTime = moment().format("h:mm:ssa");
  let userName = "there";
  request.query.user && (userName = request.query.user);
  reply.header("Content-Type", "text/html");

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${request.headers.host}</title>
      <link rel="stylesheet" type="text/css" href="/public/css/main.css" />
    </head>
    <body>
      <h1>Homepage ${port}</h1>
      <h3>Hi ${userName}, it is ${date}, but it's still ${year}</h3>
      <h4>Server time: ${serverTime}</h4>
      <h4>Browser time: <span id="browserTime"></span></h4>
      <img src="/public/images/2020.gif">
      <pre>${util.inspect(request.headers)}</pre>
      <script src="/public/js/moment-with-locales.js"></script>
      <script type="text/javascript">
      document.getElementById("browserTime").innerHTML = moment().format("h:mm:ssa");
      </script>
    </body>
  </html>`;
});

// Generic error page
fastify.get("/error", async (request, reply) => {
  reply.header("Content-Type", "text/html");
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Error</title>
    </head>
    <body>
      <h1>404 Page Not Found</h1>
    </body>
  </html>`;
});

/***************************
 *
 * CUSTOM ERROR PAGES
 *
 **************************/

// A fancy error page
fastify.get("/fancy/error", async (request, reply) => {
  reply.header("Content-Type", "text/html");
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Fancy Error</title>
    </head>
    <body style="background-color:#f7a">
      <h1>404 Page Not Found!</h1>
    </body>
  </html>`;
});

// Some fancy pages
fastify.get("/fancy/*", async (request, reply) => {
  reply.header("Content-Type", "text/html");
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Fancy Pages Live Here!</title>
    </head>
    <body style="background-color:#f7a">
      <h1>Fancy Page!</h1>
    </body>
  </html>`;
});

/***************************
 *
 * CUSTOM ERROR PAGES
 *
 **************************/

// A subsection of pages where we handle the errors ourselves
fastify.get("/handled/:page", async (request, reply) => {
  if (request.params.page == "invalid") {
    reply.code(404).header("Content-Type", "text/html");
    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Handled Error</title>
      </head>
      <body style="background-color:#755;color:#ddd">
        <h1>404 Page Not Found!</h1>
        <h4>This was handled by our application</h4>
      </body>
    </html>`;
  } else {
    reply.header("Content-Type", "text/html");
    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Handled Page</title>
      </head>
      <body style="background-color:#555;color:#ddd">
        <h1>Handled Error Pages: ${request.params.page}</h1>
      </body>
    </html>`;
  }
});

const start = async () => {
  try {
    await fastify.listen(port, "0.0.0.0");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
