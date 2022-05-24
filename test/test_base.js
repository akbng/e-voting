const { expect } = require("chai");
const {
  addresses: members,
  generateAddresses,
  shouldThrow,
} = require("./helper");

const Base = artifacts.require("Base");

contract("Base Contract", (accounts) => {
  const [alice, bob, trent] = accounts;
  let addresses = [...members, ...accounts.slice(2)];
  let baseInstance;

  beforeEach(async () => {
    baseInstance = await Base.new(addresses, { from: alice });
  });

  context("Testing SuperVisorship over the Voting System", () => {
    it("Alice should be the superVisor of the system", async () => {
      const superVisor = await baseInstance.superVisor();
      return expect(superVisor).to.equal(alice);
    });

    it("Bob should be the new superVisor", async () => {
      await baseInstance.delegateSystemSuperVisorship(bob, { from: alice });
      const newSuperVisor = await baseInstance.superVisor();
      return expect(newSuperVisor).to.equal(bob);
    });

    it("Alice should no longer be the superVisor", async () => {
      await baseInstance.delegateSystemSuperVisorship(bob, { from: alice });
      const superVisor = await baseInstance.superVisor();
      return expect(superVisor).to.not.equal(alice);
    });

    it("Should throw an error for trent is not the superVisor", async () => {
      await shouldThrow(
        baseInstance.delegateSystemSuperVisorship(bob, { from: trent }),
        "Only the superVisor of the system is allowed"
      );
    });
  });

  context("Adding new members to the Commission", () => {
    it("only superVisor of the system should add new commission members", async () => {
      await shouldThrow(
        baseInstance.addMembers(bob, { from: trent }),
        "Only the superVisor of the system is allowed"
      );
    });

    it("should not add new member if members already full", async () => {
      const newMembers = generateAddresses(10);
      await shouldThrow(
        Promise.all(
          newMembers.map((member) =>
            baseInstance.addMembers(member, { from: alice })
          )
        ),
        "Maximum number of members already exist"
      );
    });

    it("should not add duplicate member", async () => {
      await shouldThrow(
        baseInstance.addMembers(accounts.at(-1), { from: alice }),
        "Member already exist"
      );
    });

    it("should successfully add a new member", async () => {
      const result = await baseInstance.addMembers(bob, { from: alice });
      expect(result.receipt.status).to.equal(true);
      const isMember = await baseInstance.isMember(bob);
      expect(isMember).to.equal(true);
    });
  });
});
