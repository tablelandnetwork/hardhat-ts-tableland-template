import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";

async function main() {
  const Starter = await ethers.getContractFactory("Starter");
  const starter = await Starter.deploy();

  const tx = await starter.deployed();
  const rec = await tx.deployTransaction.wait();
  console.log(`Contract deployed to '${starter.address}'`);
  console.log(`Transaction hash: '${rec.transactionHash}'\n`);

  const tableName = await starter.tableName();
  console.log(`Table name '${tableName}' minted to contract.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
