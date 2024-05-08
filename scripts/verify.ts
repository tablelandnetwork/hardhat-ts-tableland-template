import { run, network, deployedContract } from "hardhat";

async function main() {
  console.log(`\nVerifying on '${network.name}'...`);

  // Ensure deployments
  if (deployedContract === "") {
    throw Error(`no contract entry for '${network.name}'`);
  }

  await run("verify:verify", {
    address: deployedContract,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
