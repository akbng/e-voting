const { expect } = require("chai");
const { duration } = require("./helper/time");
const {
  addresses: members,
  getHex,
  getStringFromHex,
  candidateNames,
  candidateHex,
  currentTime,
  shouldThrow,
} = require("./helper");

const E_Voting = artifacts.require("E_Voting");

contract("Voting System", (accounts) => {
  const [alice, bob, trent] = accounts;
  let addresses = [...members, ...accounts.slice(2)];
  let votingInstance;

  const campaignName = "Hello World!";
  const nameHex = getHex(campaignName);

  beforeEach(async () => {
    votingInstance = await E_Voting.new(addresses, { from: alice });
  });

  context("Creating New Proposal and Delegation", () => {
    it("should create a new proposal with the same owner", async () => {
      const result = await votingInstance.propose(nameHex, { from: bob });
      expect(result.receipt.status).to.equal(true);
      const { name, owner } = result.logs[0].args;
      expect(owner).to.equal(bob);
      const nameString = getStringFromHex(name);
      expect(nameString).to.equal(campaignName);
    });

    it("should return the correct proposal info", async () => {
      await votingInstance.propose(nameHex, { from: bob });
      const proposal = await votingInstance.getProposalInfo(nameHex);
      expect(getStringFromHex(proposal.name)).to.equal(campaignName);
      expect(proposal.approved).to.equal(false);
      expect(proposal.owner).to.equal(bob);
    });

    it("should return the new owner after delegating campaign and not the old owner", async () => {
      await votingInstance.propose(nameHex, { from: alice });
      await votingInstance.delegateCampaign(nameHex, bob, { from: alice });
      const { owner: newOwner } = await votingInstance.getProposalInfo(nameHex);
      expect(newOwner).to.not.equal(alice);
      expect(newOwner).to.equal(bob);
    });

    it("should throw error for trying to delegate by outsider", async () => {
      await votingInstance.propose(nameHex, { from: alice });
      await shouldThrow(
        votingInstance.delegateCampaign(nameHex, bob, { from: trent }),
        "Only the owner of the campaign is allowed"
      );
    });
  });

  context("Verify & Approve Proposal", () => {
    it("superVisor should verify proposal but not approve it", async () => {
      await votingInstance.propose(nameHex);
      const result = await votingInstance.verifyProposal(nameHex, {
        from: alice,
      });
      expect(result.receipt.status).to.equal(true);
      const { approved, approvalCount } = await votingInstance.getProposalInfo(
        nameHex
      );
      expect(Number(approvalCount)).to.equal(1);
      expect(approved).to.equal(false);
    });

    it("should verify proposal but not appove it", async () => {
      await votingInstance.propose(nameHex);
      const result = await votingInstance.verifyProposal(nameHex, {
        from: trent,
      });
      expect(result.receipt.status).to.equal(true);
      const { approved, approvalCount } = await votingInstance.getProposalInfo(
        nameHex
      );
      expect(Number(approvalCount)).to.equal(1);
      expect(approved).to.equal(false);
    });

    it("same member should not verify a proposal twice", async () => {
      await votingInstance.propose(nameHex);
      const result = await votingInstance.verifyProposal(nameHex, {
        from: trent,
      });
      expect(result.receipt.status).to.equal(true);
      await shouldThrow(
        votingInstance.verifyProposal(nameHex, { from: trent }),
        "Member already approved the proposal"
      );
    });

    it("Bob should not be able to verify the proposal", async () => {
      await votingInstance.propose(nameHex);
      await shouldThrow(
        votingInstance.verifyProposal(nameHex, { from: bob }),
        "Only members or the superVisor is allowed"
      );
    });

    it("should approve the proposal", async () => {
      await votingInstance.propose(nameHex);
      await Promise.all(
        addresses
          .filter((_, i) => i >= 6)
          .map((account) =>
            votingInstance.verifyProposal(nameHex, { from: account })
          )
      );
      const { approved, approvalCount } = await votingInstance.getProposalInfo(
        nameHex
      );
      expect(Number(approvalCount)).to.equal(addresses.length - 6);
      expect(approved).to.equal(true);
    });

    it("should not be able to verify an approved proposal", async () => {
      const systemInstance = await E_Voting.new(accounts);
      await systemInstance.propose(nameHex);
      await shouldThrow(
        Promise.all(
          accounts.map((account) =>
            systemInstance.verifyProposal(nameHex, { from: account })
          )
        ),
        "Proposal is already been approved!"
      );
    });
  });

  context("Start Campaign", () => {
    it("should not be able to start a non-approved campaign", async () => {
      await votingInstance.propose(nameHex, { from: alice });
      await shouldThrow(
        votingInstance.startCampaign(
          nameHex,
          currentTime,
          currentTime + duration.days(1),
          candidateHex,
          { from: alice }
        ),
        "Can not start an unapproved campaign"
      );
    });

    it("only the proposal owner should start the campaign", async () => {
      await votingInstance.propose(nameHex, { from: alice });
      await shouldThrow(
        votingInstance.startCampaign(
          nameHex,
          currentTime,
          currentTime + duration.days(1),
          candidateHex,
          { from: trent }
        ),
        "Only the owner of the campaign is allowed"
      );
    });

    it("owner should start the campaign successfully", async () => {
      await votingInstance.propose(nameHex, { from: bob });
      await Promise.all(
        addresses
          .filter((_, i) => i >= 6)
          .map((account) =>
            votingInstance.verifyProposal(nameHex, { from: account })
          )
      );
      const result = await votingInstance.startCampaign(
        nameHex,
        currentTime,
        currentTime + duration.days(1),
        candidateHex,
        { from: bob }
      );
      const { name, contractAddress, owner } = result.logs[0].args;
      expect(result.receipt.status).to.equal(true);
      expect(getStringFromHex(name)).to.equal(campaignName);
      expect(owner).to.equal(bob);
      expect(contractAddress).to.be.a("string").that.is.not.empty;
    });

    it("should not start the campaign with wrong date arguments", async () => {
      await votingInstance.propose(nameHex, { from: bob });
      await Promise.all(
        addresses
          .filter((_, i) => i >= 6)
          .map((account) =>
            votingInstance.verifyProposal(nameHex, { from: account })
          )
      );
      await shouldThrow(
        votingInstance.startCampaign(
          nameHex,
          Date.now() / 10 ** 3,
          Date.now() / 10 ** 3 + duration.days(3),
          candidateNames,
          { from: bob }
        ),
        "underflow"
      );
    });

    it("should not start the campaign with wrong candidates types", async () => {
      await votingInstance.propose(nameHex, { from: bob });
      await Promise.all(
        addresses
          .filter((_, i) => i >= 6)
          .map((account) =>
            votingInstance.verifyProposal(nameHex, { from: account })
          )
      );
      await shouldThrow(
        votingInstance.startCampaign(
          nameHex,
          currentTime,
          currentTime + duration.days(1),
          candidateNames,
          { from: bob }
        ),
        "invalid arrayify value"
      );
    });
  });
});
