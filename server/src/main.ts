import Server from './Server';

async function main() {
  const server = new Server(8888);
  await server.start();
}

main()
  .catch((err) => console.error(err));
