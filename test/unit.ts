import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { type SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers, upgrades } from "hardhat";
import { type TablelandTables } from "@tableland/evm";
// Import your contracts from `contracts` directory
import { type Starter } from "../typechain-types";

chai.use(chaiAsPromised);
const expect = chai.expect;

// Test smart contract deployment and method calls
// Note: SQL *does not* get validated nor materialized in this environment
describe("Starter contract", function () {
  // Set global accounts and the Tableland registry contract
  let accounts: SignerWithAddress[];
  let registry: TablelandTables;
  // Custom `Starter` contract
  let starter: Starter;

  // Deploy the`TablelandTables` registry contract once
  async function deployFixture() {
    // Set global accounts
    accounts = await ethers.getSigners();
    // Deploy `TablelandTables` to allow for table creates and mutates
    const TablelandTablesFactory =
      await ethers.getContractFactory("TablelandTables");
    // @ts-expect-error `Contract` is an extension of `BaseContract`
    const deployment = (await upgrades.deployProxy(
      TablelandTablesFactory,
      ["http://localhost:8080/"],
      {
        kind: "uups",
      }
    )) as TablelandTables;
    registry = await deployment.waitForDeployment();
  }

  // Deploy the fixture and `Starter` to ensure deterministic table IDs
  beforeEach(async function () {
    await loadFixture(deployFixture);
    const StarterFactory = await ethers.getContractFactory("Starter");
    // @ts-expect-error `Contract` is an extension of `BaseContract`
    starter = (await StarterFactory.deploy()) as Starter;
    await starter.waitForDeployment();
  });

  it("should deploy, create a table, and set the controller", async function () {
    // Check that the registry minted a table to the starter and set the controller
    const txResponse = starter.deploymentTransaction();
    const rec = await txResponse?.wait();
    const tx = await rec?.getTransaction();
    await expect(tx)
      .to.emit(registry, "CreateTable")
      .withArgs(await starter.getAddress(), 1, anyValue) // Use `anyValue` instead of a CREATE TABLE statement
      .to.emit(registry, "SetController")
      .withArgs(1, await starter.getAddress());
  });

  it("should have the contract own the table", async function () {
    expect(await registry.ownerOf(1)).to.equal(await starter.getAddress()); // Table ID is `1` in this environment
  });

  it("should have the correct policy set", async function () {
    await starter.insertVal("hello");
    const tableEvents = await registry.queryFilter(registry.filters.RunSQL());
    const [event] = tableEvents ?? [];
    const policy = event.args?.policy;
    // Check the policy values are equal to those set in the contract
    expect(policy.allowInsert).to.equal(true);
    expect(policy.allowUpdate).to.equal(true);
    expect(policy.allowDelete).to.equal(false);
    expect(policy.whereClause).to.equal("");
    expect(policy.withCheck).to.equal("");
    expect(policy.updatableColumns).to.deep.equal(["val"]);
  });

  it("should return the table name", async function () {
    // Custom getter method
    expect(await starter.tableName()).to.equal("starter_table_31337_1");
  });

  it("should call registry to insert value", async function () {
    // Call the method externally, albeit, the contract is sending the SQL
    // You *could* directly call the registry contract such that ACLs are enforced
    await expect(await starter.connect(accounts[1]).insertVal("hello"))
      .to.emit(registry, "RunSQL")
      .withArgs(await starter.getAddress(), true, 1, anyValue, anyValue);
  });

  it("should call registry to update value", async function () {
    await expect(await starter.connect(accounts[1]).updateVal(1, "world"))
      .to.emit(registry, "RunSQL")
      .withArgs(await starter.getAddress(), true, 1, anyValue, anyValue);
  });

  it("should call registry to delete value", async function () {
    await expect(await starter.connect(accounts[1]).deleteVal(1))
      .to.emit(registry, "RunSQL")
      .withArgs(await starter.getAddress(), true, 1, anyValue, anyValue);
  });
});
