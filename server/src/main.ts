import Server from './Server';

async function main() {
  const server = new Server(8888);
  await server.start();
}

main()
  .then(() => console.log(`Server launched`))
  .catch((err) => console.error(err));
