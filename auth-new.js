const Hapi = require('hapi');

const server = new Hapi.Server({ host: 'localhost', port: 3000 });

let authed = false;
const user = { name: 'Josh' };

server.route({
  method: 'GET',
  path: '/',
  handler(request, h) {
    return `
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
</html>`;
  }
});

server.route({
  method: 'GET',
  path: '/login',
  config: {
    auth: false,
  },
  handler(request, h) {
    if (authed) {
      return h.redirect('/');
    }

    return `
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
</html>`;
  }
});

server.route({
  method: 'POST',
  path: '/api/login',
  config: {
    auth: false,
  },
  handler(request, h) {
    authed = true;
    return h.response();
    // return .continue({ credentials: user });
  }
});

server.route({
  method: 'POST',
  path: '/api/logout',
  config: {
    auth: false,
  },
  handler(request, h) {
    authed = false;
    return h.response();
    // reply.continue({ credentials: {} });
  }
});

server.auth.scheme('login', () => ({
  authenticate(request, h) {
    if (authed) {
      return h.authenticated({ credentials: user });
    } else {
      return h.redirect('/login');
    }
  }
}));

server.auth.strategy('session', 'login');

server.start();