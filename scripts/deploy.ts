import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";
import { ITablelandTables__factory as TablelandTables } from "@tableland/evm";

async function main() {
  // First, deploy the contract, which will create a table in the process
  const Starter = await ethers.getContractFactory("Starter");
  const starter = await Starter.deploy();
  await starter.waitForDeployment();
  const deployTx = starter.deploymentTransaction();
  if (!deployTx) {
    throw new Error("Deployment transaction not found");
  }
  const deployReceipt = await ethers.provider.getTransactionReceipt(
    deployTx.hash
  );
  if (!deployReceipt) {
    throw new Error("Deployment receipt not found");
  }

  // Log some information about the deployment
  const address = await starter.getAddress();
  const txHash = deployTx?.hash;
  console.log(`Contract deployed to '${address}'`);
  console.log(`Transaction hash: '${txHash}'\n`);

  // Set up the ABI & interface for the registry contract
  const { abi } = TablelandTables;
  const iface = new ethers.Interface(abi);
  // Parse all of the logs for emitted registry events
  const events = [];
  for (const log of deployReceipt.logs) {
    const event = iface.parseLog(log);
    if (event != null) events.push(event);
  }
  // If a `CreateTable` event exists, parse the log to get the table ID
  if (events.length > 0) {
    for (const event of events) {
      if (event.name === "CreateTable") {
        const { owner, tableId } = event.args;
        console.log(`Table owner '${owner}' minted table ID '${tableId}'`);
      }
    }
  }

  // And let's test out the table name getter on the contract
  const tableName = await starter.tableName();
  console.log(`Table name '${tableName}' minted to contract.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
