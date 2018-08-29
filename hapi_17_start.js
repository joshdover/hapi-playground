const Hapi = require('hapi');
const { serverOptions, routes } = require('./hapi_17');

async function start() {
  try {
    const server = Hapi.server(serverOptions);
    routes.map(server.route);

    await server.start();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log(`Server running at:`, server.info.uri);
};

start();
