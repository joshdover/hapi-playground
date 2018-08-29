const Hapi = require('hapi');
const Boom = require('boom');

function installShim(server) {

  /**
   * Request wrapping factory that emulates Hapi v14 behavior.
   */
  function handlerWrapper(originalHandler, { isPreResponse = false } = {}) {
    // Leave undefined, null, and string (registered server functions) values unchanged.
    if (originalHandler === null || 
        originalHandler === undefined || 
        typeof originalHandler === 'string' || 
        originalHandler instanceof String) {
      return originalHandler;
    }

    // Support arrays of handlers
    if (originalHandler instanceof Array) {
      return originalHandler.map(o => handlerWrapper(o, { isPreResponse }));
    }

    // Support object-style methods (ex. in pre responses)
    if (typeof originalHandler === 'object' && typeof originalHandler.method === 'function') {
      originalHandler.method = handlerWrapper(originalHandler.method, { isPreResponse });
      return originalHandler;
    }

    // If we're to this point but we don't have a function, something is wrong.
    if (typeof originalHandler !== 'function') {
      throw new Error(`${originalHandler} is not a function!`);
    }

    // NOTE: the `name` property of this wrapped handler will be undefined.
    return (request, h) => {
      return new Promise((resolve, reject) => {
        let replied = false;

        // Creates a thunk around the translation function that will:
        // - Verify only one reply method is called in a handler
        // - Return the constructed response object
        // - Defer resolving the promise until the handler function has completed modifying it.
        const replyWrapper = (func) => {
          return (...args) => {
            if (replied) {
              throw new Error(`reply cannot be called more than once!`);
            } else {
              replied = true;
              const response = func.call(this, ...args);

              // Defer actually resolving the promise until the handler has finished modifying the response.
              process.nextTick(() => {
                resolve(response);
              })

              return response;
            }
          }
        }

        // The main reply interface.
        const reply = replyWrapper((err, resp) => {
          if (err instanceof Error) {
            return Boom.boomify(err);
          } else if (isPreResponse) {
            return err || resp;  // preresponses should not be wrapped with h.response
          } else {
            return h.response(err || resp);
          }
        });

        reply.redirect = replyWrapper((uri) => {
          return h.redirect(uri);
        });

        reply.continue = replyWrapper(() => {
          return h.continue;
        });

        reply.close = replyWrapper(() => {
          return h.close;
        });

        originalHandler(request, reply);
      });
    }
  }

  /**
   * Override server.route
   */
  const originalRoute = server.route;
  server.route = (routeConfigs) => {
    // Coerce into an array
    routeConfigs = [].concat(routeConfigs);

    routeConfigs.forEach((routeConfig) => {
      // Handler can be in either of these locations
      routeConfig.handler = handlerWrapper(routeConfig.handler);

      // If there's no config object, we're done.
      if (!routeConfig.config) {
        return;
      } else if (typeof routeConfig.config === 'function') {
        // the `config` key can be a function. call it the same way Hapi.Route would.
        routeConfig.config = routeConfig.config.call(server.realm.settings.bind, server);
      }

      // Replace config.handler if present
      routeConfig.config.handler = handlerWrapper(routeConfig.config.handler);

      // Replace any pre responses
      if (routeConfig.config.pre instanceof Array) {
        routeConfig.config.pre = routeConfig.config.pre.map((pre) => {
          if (typeof pre === 'function') {
            // Support implicit pre assigning by function name.
            return handlerWrapper({ method: pre, assign: pre.name });
          } else {
            return handlerWrapper(pre);
          }
        })
      }

      // Replace any ext functions
      if (routeConfig.config.ext) {
        Object.keys(routeConfig.config.ext).forEach((extType) => {
          routeConfig.config.ext[extType] = handlerWrapper(routeConfig.config.ext[extType]);
        });
      }
    });

    // With all of our handlers replaced, pass them up to Hapi.Server
    return originalRoute.call(server, routeConfigs);
  }

  /**
   * Override server.ext
   */
  const originalExt = server.ext;
  server.ext = (event, method, options) => {
    let events = [];

    // Support individual extension point calls or Array of extension points.
    if (typeof event === 'string' || event instanceof String) {
      events.push({
        type: event,
        method,
        options
      });
    } else if (event instanceof Array) {
      events = event;
    } else {
      throw new Error(`Unexpected arguments passed to server.ext: ${event}, ${method}, ${options}`);
    }

    // Replace all methods
    events.forEach((event) => {
      if (typeof event.method !== 'function') {
        throw new Error(`Extension points must supply a method function!`);
      }

      event.method = handlerWrapper(event.method);
    });

    return originalExt.call(server, events);
  }
};



/**
 * Demo application
 */

const server = new Hapi.Server({ host: 'localhost', port: 3000 });
installShim(server);

server.route({
  method: 'GET',
  path: '/a',
  handler(request, reply) {
    reply('Hello World!').code(404).type('text/blah');
  }
});

server.route({
  method: 'GET',
  path: '/b',
  handler(request, reply) {
    reply.redirect('/a').temporary();
  }
});

server.route({
  method: 'GET',
  path: '/c',
  config: {
    handler(request, reply) {
      reply({ hello: 'c' });
    }
  }
});

server.route({
  method: 'GET',
  path: '/d',
  config: {
    pre: [
      function wow1(req, reply) {
        reply('x')
      },
      { method: (req, reply) => reply('x'), assign: 'wow2' }
    ],
    handler(request, reply) {
      reply(request.pre);
    }
  }
});

server.ext('onRequest', (request, reply) => {
  console.log(`Request: ${request.method.toUpperCase()} ${request.path}`);
  reply.continue();
});

server.ext([
  {
    type: 'onRequest',
    method(request, reply) {
      if (request.path === '/b') {
        reply('TAKING OVER').code(201).takeover();
      } else {
        reply.continue();
      }
    }
  }
]);

server.start();
