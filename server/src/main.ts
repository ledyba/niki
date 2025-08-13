import Server from './Server.js';

async function main() {
  const server = new Server(3000);
  await server.start();
}

main()
  .catch((err) => console.error(err));
