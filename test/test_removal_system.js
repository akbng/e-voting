const { expect } = require("chai");
const { addresses: members, shouldThrow } = require("./helper");
const {
  fastForward,
  revertBack,
  takeSnapshot,
  duration,
} = require("./helper/time");

const E_Voting = artifacts.require("E_Voting");

contract("Removal System", function (accounts) {
  const [alice, bob, trent] = accounts;
  let addresses = [...members.slice(2), trent, ...accounts.slice(4)]; // shorten to achieve majority vote
  let removalInstance;

  beforeEach(async () => {
    removalInstance = await E_Voting.new(addresses, { from: alice });
  });

  context("Member Removal by SuperVisor", () => {
    it("superVisor should not remove a member", async () => {
      await shouldThrow(
        removalInstance.removeMember(trent, { from: alice }),
        "can not remove a member with no reports"
      );
    });

    it("superVisor should not remove anyone who is no member", async () => {
      await shouldThrow(
        removalInstance.removeMember(bob, { from: alice }),
        "provided user is not a member"
      );
    });

    it("superVisor should not remove a member with more reputation than reports", async () => {
      await removalInstance.reportMember(trent, { from: bob });
      await removalInstance.praiseMember(trent, { from: accounts[3] });
      await shouldThrow(
        removalInstance.removeMember(trent, { from: alice }),
        "can not remove a well reputed member"
      );
    });

    it("superVisor should only remove a member having more reports than reputation", async () => {
      await removalInstance.reportMember(trent, { from: bob });
      await removalInstance.removeMember(trent, { from: alice });
      const member = await removalInstance.getMemberInfo(trent);
      expect(member.removed).to.equal(true);
      const totalMembers = await removalInstance.numOfMembers();
      expect(totalMembers.toNumber()).to.equal(addresses.length - 1);
    });
  });

  context("Member Removal by Member Voting", () => {
    it("member should not remove other member", async () => {
      await shouldThrow(
        removalInstance.removeMember(trent, { from: accounts.at(-1) }),
        "Only the superVisor of the system is allowed"
      );
    });

    it("member should request removal of other member", async () => {
      await removalInstance.requestMemberRemoval(trent, {
        from: accounts.at(-1),
      });
      const member = await removalInstance.getMemberInfo(trent);
      expect(Number(member.removeRequest)).to.equal(1);
      expect(member.removed).to.equal(false);
    });

    it("member should not request removal of a member twice", async () => {
      await removalInstance.requestMemberRemoval(trent, {
        from: accounts.at(-1),
      });
      await shouldThrow(
        removalInstance.requestMemberRemoval(trent, {
          from: accounts.at(-1),
        }),
        "Member already requested for removal"
      );
    });

    it("user should not request for removal of members", async () => {
      await shouldThrow(
        removalInstance.requestMemberRemoval(trent, { from: bob }),
        "Only members are allowed"
      );
    });

    it("member should be removed by majority vote by the other members", async () => {
      await Promise.all(
        accounts
          .filter((_, i) => i >= 4)
          .map((member) =>
            removalInstance.requestMemberRemoval(trent, { from: member })
          )
      );
      const member = await removalInstance.getMemberInfo(trent);
      expect(member.removed).to.equal(true);
      const totalMembers = await removalInstance.numOfMembers();
      expect(totalMembers.toNumber()).to.equal(addresses.length - 1);
    });
  });

  context("SuperVisor Removal", () => {
    it("users should not remove active superVisor", async () => {
      await shouldThrow(
        removalInstance.removeInactiveSuperVisor(),
        "Can not remove active superVisor"
      );
    });

    it("superVisor should be demoted to member after a month of inactivity", async () => {
      const oldSuperVisor = await removalInstance.superVisor();
      const { result: snapId } = await takeSnapshot();
      await fastForward(duration.days(31));
      await removalInstance.removeInactiveSuperVisor();
      const supervisorIsOldSuperVisor = await removalInstance.isSuperVisor(
        oldSuperVisor
      );
      const oldSuperVisorIsMember = await removalInstance.isMember(
        oldSuperVisor
      );
      await revertBack(snapId);
      expect(supervisorIsOldSuperVisor).to.equal(false);
      expect(oldSuperVisorIsMember).to.equal(true);
    });

    it("any user should not request for superVisor removal", async () => {
      await shouldThrow(
        removalInstance.requestSuperVisorRemoval({ from: bob }),
        "Only members are allowed"
      );
    });

    it("member should request for superVisor removal", async () => {
      await removalInstance.requestSuperVisorRemoval({ from: trent });
      const supervisorInfo = await removalInstance.getSuperVisorInfo();
      expect(Number(supervisorInfo.removeRequest)).to.equal(1);
    });

    it("member should not request for superVisor removal twice", async () => {
      await removalInstance.requestSuperVisorRemoval({ from: trent });
      await shouldThrow(
        removalInstance.requestSuperVisorRemoval({ from: trent }),
        "Member already requested superVisor removal"
      );
    });

    it("superVisor should be removed permanently by majority vote of the members", async () => {
      const oldSuperVisor = await removalInstance.superVisor();
      await Promise.all(
        accounts
          .filter((_, i) => i >= 4)
          .map((member) =>
            removalInstance.requestSuperVisorRemoval({ from: member })
          )
      );
      await removalInstance.removeSuperVisorByVote({ from: trent });
      const supervisorIsOldSuperVisor = await removalInstance.isSuperVisor(
        oldSuperVisor
      );
      expect(supervisorIsOldSuperVisor).to.equal(false);
    });
  });
});
