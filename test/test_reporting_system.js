const { expect } = require("chai");
const { addresses: members, shouldThrow } = require("./helper");

const E_Voting = artifacts.require("E_Voting");

contract("Reporting System", function (accounts) {
  const [alice, bob, trent] = accounts;
  let addresses = [...members, ...accounts.slice(2)];
  let reportingInstance;

  beforeEach(async () => {
    reportingInstance = await E_Voting.new(addresses, { from: alice });
  });

  context("Reporting Members", () => {
    it("user should report against a member", async () => {
      await reportingInstance.reportMember(trent, { from: bob });
      const member = await reportingInstance.getMemberInfo(trent);
      expect(Number(member.reports)).to.equal(1);
      expect(member.removed).to.equal(false);
    });

    it("user should not report a user who is no member", async () => {
      await shouldThrow(
        reportingInstance.reportMember(bob, { from: bob }),
        "reported user is not a member"
      );
    });

    it("member should not report against other members", async () => {
      await shouldThrow(
        reportingInstance.reportMember(trent, { from: accounts.at(-1) }),
        "Members are not allowed"
      );
    });

    it("superVisor should not report against a member", async () => {
      await shouldThrow(
        reportingInstance.reportMember(trent, { from: alice }),
        "SuperVisor is not allowed"
      );
    });
  });

  context("Reporting SuperVisors", () => {
    it("user should report against the superVisor", async () => {
      await reportingInstance.reportSuperVisor(alice, { from: bob });
      const superVisor = await reportingInstance.getSuperVisorInfo();
      expect(Number(superVisor.reports)).to.equal(1);
      expect(superVisor.removed).to.equal(false);
    });

    it("should not report a user who is no superVisor", async () => {
      await shouldThrow(
        reportingInstance.reportSuperVisor(trent, { from: bob }),
        "reported user is not the superVisor"
      );
    });

    it("superVisor should not report against superVisor (which is dumb)", async () => {
      await shouldThrow(
        reportingInstance.reportSuperVisor(alice, { from: alice }),
        "SuperVisor is not allowed"
      );
    });

    it("member should not report against the superVisor", async () => {
      await shouldThrow(
        reportingInstance.reportSuperVisor(alice, { from: trent }),
        "Members are not allowed"
      );
    });
  });
});
