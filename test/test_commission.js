const { expect } = require("chai");
const { addresses: members, shouldThrow } = require("./helper");

const Commission = artifacts.require("Commission");

contract("Commission", function (accounts) {
  const [alice, bob, eve] = accounts;
  let addresses = [...members, alice, ...accounts.slice(3)];
  let commissionInstance;

  beforeEach(async () => {
    commissionInstance = await Commission.new(addresses, { from: alice });
  });

  context("Check Membership", () => {
    it(`Number of Commission members should be equal to ${addresses.length}`, async () => {
      const numOfMembers = await commissionInstance.numOfMembers();
      return expect(numOfMembers.toNumber()).to.equal(addresses.length);
    });

    it(`Alice should be a member`, async () => {
      const isMember = await commissionInstance.isMember(alice);
      return expect(isMember).to.equal(true);
    });

    it(`Bob should not be a member`, async () => {
      const isMember = await commissionInstance.isMember(bob);
      return expect(isMember).to.equal(false);
    });

    it("returned members should equal to the addresses array", async () => {
      const members = await commissionInstance.getAllMembers();
      return expect(members).to.deep.equal(addresses);
    });
  });

  context("Transfering Membership", () => {
    it("Bob should now be a member, after Alice's transfer", async () => {
      await commissionInstance.transferMembership(bob, {
        from: alice,
      });
      const isMember = await commissionInstance.isMember(bob);
      return expect(isMember).to.equal(true);
    });

    it("Alice should no longer be a member after the transfer", async () => {
      await commissionInstance.transferMembership(bob, {
        from: alice,
      });
      const isMember = await commissionInstance.isMember(alice);
      return expect(isMember).to.equal(false);
    });

    it("should throw error since Eve is not a member", async () => {
      await shouldThrow(
        commissionInstance.transferMembership(bob, { from: eve }),
        "Only members are allowed"
      );
    });
  });
});
