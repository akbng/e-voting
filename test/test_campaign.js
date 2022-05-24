const { expect } = require("chai");
const {
  duration,
  fastForward,
  takeSnapshot,
  revertBack,
} = require("./helper/time");
const {
  addresses: members,
  candidateHex,
  candidateNames,
  currentTime,
  shouldThrow,
  getStringFromHex,
} = require("./helper");

const Commission = artifacts.require("Base");
const Campaign = artifacts.require("Campaign");

contract("Campaign", (accounts) => {
  const [alice, bob, trent] = accounts;
  let addresses = [...members, ...accounts.slice(2)];
  let commissionInstance;
  let campaignInstance;

  beforeEach(async () => {
    commissionInstance = await Commission.new(addresses, { from: alice });
    campaignInstance = await Campaign.new(
      commissionInstance.address,
      currentTime,
      currentTime + duration.days(1),
      candidateHex
    );
  });

  context("Voter Application", () => {
    it("should not create a campaign with same starting and ending time", async () => {
      await shouldThrow(
        Campaign.new(
          commissionInstance.address,
          currentTime + duration.days(1),
          currentTime + duration.days(1),
          candidateHex
        ),
        "Ending time should be less than starting time"
      );
    });

    it("should not apply after the voting starts", async () => {
      await shouldThrow(
        campaignInstance.applyVoter({ from: bob }),
        "Cannot apply after voting has started"
      );
    });

    it("should not apply after the voting ends", async () => {
      const { result: snapId } = await takeSnapshot();
      await fastForward(duration.days(2));
      await shouldThrow(
        campaignInstance.applyVoter({ from: bob }),
        "Cannot apply after voting has ended"
      );
      await revertBack(snapId);
    });

    it("should successfully apply as voter", async () => {
      const localInstance = await Campaign.new(
        commissionInstance.address,
        currentTime + duration.days(1),
        currentTime + duration.days(2),
        candidateHex
      );
      const result = await localInstance.applyVoter({ from: bob });
      expect(result.receipt.status).to.equal(true);
      const { verified, hasVoted } = await localInstance.getVoterInfo(bob);
      expect(verified).to.equal(false);
      expect(hasVoted).to.equal(false);
    });

    it("should successfully get the voters list", async () => {
      const voterList = await campaignInstance.getVotersList();
      expect(voterList).to.be.empty;
    });

    it("superVisor should not apply", async () => {
      const localInstance = await Campaign.new(
        commissionInstance.address,
        currentTime + duration.days(1),
        currentTime + duration.days(2),
        candidateHex
      );
      await shouldThrow(
        localInstance.applyVoter({ from: alice }),
        "SuperVisor can not vote"
      );
    });

    it("members should not apply", async () => {
      const localInstance = await Campaign.new(
        commissionInstance.address,
        currentTime + duration.days(1),
        currentTime + duration.days(2),
        candidateHex
      );
      await shouldThrow(
        localInstance.applyVoter({ from: trent }),
        "Members can not vote"
      );
    });
  });

  context("Verifying Voter Applications", () => {
    it("non members should not verify a user", async () => {
      await shouldThrow(
        campaignInstance.verifyVoter(bob, { from: bob }),
        "Only a member or superVisor can verify!"
      );
    });

    it("should not verify after the campaign has ended", async () => {
      const { result: snapId } = await takeSnapshot();
      await fastForward(duration.days(2));
      await shouldThrow(
        campaignInstance.verifyVoter(bob, { from: trent }),
        "Cannot verify after voting has ended"
      );
      await revertBack(snapId);
    });

    it("member should verify a user but not approve him", async () => {
      const result = await campaignInstance.verifyVoter(bob, { from: trent });
      expect(result.logs[0].args.voter?.approvalCount * 1).to.equal(1);
    });

    it("superVisor should verify a user but not approve him", async () => {
      const result = await campaignInstance.verifyVoter(bob, { from: alice });
      expect(result.logs[0].args.voter?.approvalCount * 1).to.equal(1);
    });

    it("same member should not approve more than once", async () => {
      await campaignInstance.verifyVoter(bob, { from: trent });
      await shouldThrow(
        campaignInstance.verifyVoter(bob, { from: trent }),
        "Member already verified the voter"
      );
    });

    it("majority approval should succesfully approve a user", async () => {
      await Promise.all(
        accounts
          .filter((_, i) => i >= 2)
          .map((member) => campaignInstance.verifyVoter(bob, { from: member }))
      );
      const { verified } = await campaignInstance.getVoterInfo(bob);
      expect(verified).to.equal(true);
    });

    it("no one should verify members or superVisors", async () => {
      await shouldThrow(
        campaignInstance.verifyVoter(trent, { from: alice }),
        "Cannot verify a member as a voter"
      );
    });
  });

  context("Casting Vote", () => {
    it("should not vote before the start time", async () => {
      const localInstance = await Campaign.new(
        commissionInstance.address,
        currentTime + duration.days(1),
        currentTime + duration.days(2),
        candidateHex
      );
      await shouldThrow(
        localInstance.vote(1, { from: bob }),
        "Voting period has not started yet!"
      );
    });

    it("should not vote after deadline", async () => {
      const { result: snapId } = await takeSnapshot();
      await fastForward(duration.days(2));
      await shouldThrow(
        campaignInstance.vote(0, { from: bob }),
        "Voting period has ended!"
      );
      await revertBack(snapId);
    });

    it("unapproved voter should not vote", async () => {
      await shouldThrow(
        campaignInstance.vote(1, { from: bob }),
        "Voter has no right to vote"
      );
    });

    it("members should not vote", async () => {
      await shouldThrow(
        campaignInstance.vote(1, { from: trent }),
        "Members can not vote"
      );
    });

    it("superVisor should not vote", async () => {
      await shouldThrow(
        campaignInstance.vote(1, { from: alice }),
        "SuperVisor can not vote"
      );
    });

    it("approved voter should successfully vote", async () => {
      await Promise.all(
        accounts
          .filter((_, i) => i >= 2)
          .map((member) => campaignInstance.verifyVoter(bob, { from: member }))
      );
      await campaignInstance.vote(1, { from: bob });
      const candidate = await campaignInstance.candidates(1);
      expect(candidate.voteCount.toNumber()).to.equal(1);
      const { hasVoted } = await campaignInstance.getVoterInfo(bob);
      expect(hasVoted).to.equal(true);
    });

    it("voter should not vote twice", async () => {
      await Promise.all(
        accounts
          .filter((_, i) => i >= 2)
          .map((member) => campaignInstance.verifyVoter(bob, { from: member }))
      );
      await campaignInstance.vote(0, { from: bob });
      await shouldThrow(
        campaignInstance.vote(1, { from: bob }),
        "Voter has already casted vote"
      );
    });
  });

  context("Finding Winner", () => {
    it("should not calculate winner before voting ends", async () => {
      await shouldThrow(campaignInstance.findWinner());
    });

    it("should find the right winner", async () => {
      await Promise.all(
        accounts
          .filter((_, i) => i >= 2)
          .map((member) => campaignInstance.verifyVoter(bob, { from: member }))
      );
      await campaignInstance.vote(1, { from: bob });
      const { result: snapId } = await takeSnapshot();
      await fastForward(duration.days(2));
      const winner = await campaignInstance.findWinner();
      await revertBack(snapId);
      expect(getStringFromHex(winner)).to.equal(candidateNames[1]);
    });
  });
});
