const Hapi17 = require('hapi');
const Hapi16 = require('hapi-16');
const { getRoutes, serverOptions } = require("./hapi_17");

runTests = (server) => {
  test('it returns validation information', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/payload_validation/'
    });

    expect(response.statusCode).toEqual(400);
  });

  test('it returns validation information', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/all_validation/index-pattern',
      payload: {}
    });

    expect(response.statusCode).toEqual(400);
  });
}

describe('hapi 17', () => {
  const server = new Hapi17.Server(serverOptions);
  server.route(getRoutes(true));

  runTests(server);
});

// describe('hapi 16', () => {
//   const server = new Hapi16.Server();
//   server.connection(serverOptions)
//   server.route(getRoutes(false));

//   runTests(server);
// });


runTests = (servers) => {
  test('it returns validation information', async () => {
    const responses = await Promise.all(servers.map(s => s.inject({
      method: 'POST',
      url: '/payload_validation/'
    })));

    const firstResponse = responses[0];
    responses.forEach(response => {
      expect(response.statusCode).toEqual(400);
      expect(JSON.parse(firstResponse.payload)).toEqual(JSON.parse(response.payload));
    });
  });

  test('it returns validation information', async () => {
    const responses = await Promise.all(servers.map(s => s.inject({
      method: 'GET',
      url: '/path_validation/xx'
    })));

    const firstResponse = responses[0];
    responses.forEach(response => {
      expect(response.statusCode).toEqual(400);
      expect(JSON.parse(firstResponse.payload)).toEqual(JSON.parse(response.payload));
    });
  });

  // test('it returns validation information', async () => {
  //   const responses = await Promise.all(servers.map(s => s.inject({
  //     method: 'GET',
  //     url: '/query_validation/'
  //   })));

  //   const firstResponse = responses[0];
  //   responses.forEach(response => {
  //     expect(response.statusCode).toEqual(400);
  //     expect(JSON.parse(firstResponse.payload)).toEqual(JSON.parse(response.payload));
  //   });
  // });

  
}

// const server17 = new Hapi17.Server(serverOptions);
// server17.route(getRoutes(true));

// const server16 = new Hapi16.Server();
// server16.connection(serverOptions);
// server16.route(getRoutes(false));

// runTests([server17, server16]);