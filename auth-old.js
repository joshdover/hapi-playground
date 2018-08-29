const Hapi = require('hapi-14');

const server = new Hapi.Server();
server.connection({ host: 'localhost', port: 3000 });

let authed = false;
const user = { name: 'Josh' };

server.route({
  method: 'GET',
  path: '/',
  // config: {

  // }
  handler(request, reply) {
        reply(`
<html>
<body>
<h1>You're logged in</h1>
<button id="b">Logout</button>
<script type="text/javascript">
document.getElementById("b").addEventListener('click', () => {
  fetch('/api/logout', { method: 'POST' })
    .then(() => window.location = '/login');
});
</script>
</body>
</html>`);
  }
});

server.route({
  method: 'GET',
  path: '/login',
  config: {
    auth: false,
  },
  handler(request, reply) {
    if (authed) {
      return reply.redirect('/');
    }
    reply(`
<html>
<body>
<button id="b">Login</button>
<script type="text/javascript">
document.getElementById("b").addEventListener('click', () => {
  fetch('/api/login', { method: 'POST' })
    .then(() => window.location = '/');
});
</script>
</body>
</html>`);
  }
});

server.route({
  method: 'POST',
  path: '/api/login',
  config: {
    auth: false,
  },
  handler(request, reply) {
    authed = true;
    reply.continue({ credentials: user });
  }
});

server.route({
  method: 'POST',
  path: '/api/logout',
  config: {
    auth: false,
  },
  handler(request, reply) {
    authed = false;
    reply.continue({ credentials: {} });
  }
});

server.auth.scheme('login', () => ({
  authenticate(request, reply) {
    if (authed) {
      return reply.continue({ credentials: user });
    } else {
      return reply.redirect('/login');
    }
  }
}));

server.auth.strategy('session', 'login', 'required');

server.start();