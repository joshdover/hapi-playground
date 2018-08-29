const Joi = require('joi');

module.exports.serverOptions = {
  host: 'localhost',
  port: 3000
};

const routes = [
  {
    method: 'POST',
    path: '/payload_validation/',
    config: {
      validate: {
        failAction: async (request, h, err) => {
          throw err;
        },
        payload: {
          name: Joi.string().min(3).max(10).required()
        }
      }
    },
    handler: (request, h) => {
      return "passed!"
    }
  },
  {
    method: 'GET',
    path: '/path_validation/{name}',
    config: {
      validate: {
        failAction: async (request, h, err) => {
          throw err;
        },
        params: {
          name: Joi.string().min(3).max(10).required()
        }
      }
    },
    handler: (request, h) => {
      return "passed!"
    }
  },
  {
    method: 'GET',
    path: '/query_validation/',
    config: {
      validate: {
        failAction: async (request, h, err) => {
          throw err;
        },
        query: {
          name: Joi.string().min(3).max(10).required()
        }
      }
    },
    handler: (request, h) => {
      return "passed!"
    }
  },
  {
    method: 'POST',
    path: '/all_validation/{type}/{id?}',
    config: {
      validate: {
        failAction: async (request, h, err) => {
          throw err;
        },
        query: Joi.object().keys({
          overwrite: Joi.boolean().default(false)
        }).default(),
        params: Joi.object().keys({
          type: Joi.string().required(),
          id: Joi.string()
        }).required(),
        payload: Joi.object({
          attributes: Joi.object().required()
        }).required()
      },
      handler: (request, h) => {
        return request.xxxxxxxasdf.asdf;
      }
    },
    
  }
];

module.exports.getRoutes = (useAsync) => {
  if (useAsync) {
    return routes;
  }

  return routes.map(r => {
    r = Object.assign({}, r, {
      handler: async (req, reply) => {
        reply(await r.handler(req));
      }
    });

    if (r.config.validate.failAction)
      delete r.config.validate.failAction;

    return r;
  });
};