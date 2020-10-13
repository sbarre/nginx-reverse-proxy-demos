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
      <h3>Hi ${userName}, it is ${date}, but it's still 2020</h3>
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

const start = async () => {
  try {
    await fastify.listen(port, "0.0.0.0");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
