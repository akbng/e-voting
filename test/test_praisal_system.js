const { expect } = require("chai");
const { addresses: members, shouldThrow } = require("./helper");

const E_Voting = artifacts.require("E_Voting");

contract("Praisal System", function (accounts) {
  const [alice, bob, trent] = accounts;
  let addresses = [...members, ...accounts.slice(2)];
  let praisingInstance;

  beforeEach(async () => {
    praisingInstance = await E_Voting.new(addresses, { from: alice });
  });

  context("Praising Members", () => {
    it("user should praise and increase reputation for a member", async () => {
      await praisingInstance.praiseMember(trent, { from: bob });
      const member = await praisingInstance.getMemberInfo(trent);
      expect(Number(member.reputation)).to.equal(1);
    });

    it("user should not praise a use who is no member", async () => {
      await shouldThrow(
        praisingInstance.praiseMember(alice, { from: bob }),
        "praised user is not a member"
      );
    });

    it("member should not praise anyone", async () => {
      await shouldThrow(
        praisingInstance.praiseMember(accounts.at(-1), { from: trent }),
        "Members are not allowed"
      );
    });

    it("supervisor should not praise anyone", async () => {
      await shouldThrow(
        praisingInstance.praiseMember(trent, { from: alice }),
        "SuperVisor is not allowed"
      );
    });
  });
});
