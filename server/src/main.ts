import Server from './Server';

async function main() {
  const server = await Server.create("localhost", 8888);
  await server.start();
}

main()
  .then(() => console.log(`Server launched`))
  .catch((err) => console.error(err));
