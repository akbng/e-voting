// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./Base.sol";
import "./Campaign.sol";

abstract contract VotingSystem is Base {
    event NewCampaignProposed(bytes32 name, address owner);
    event NewCampaignApproved(bytes32 name, uint8 approvalCount, address owner);
    event NewCampaignStarted(
        bytes32 name,
        address contractAddress,
        address owner
    );
    event CampaignDelegated(address to);

    modifier onlyCampaignOwner(bytes32 _campaignName) {
        require(
            getProposalInfo(_campaignName).owner == msg.sender,
            "Only the owner of the campaign is allowed"
        );
        _;
    }

    function propose(bytes32 _name) public {
        Proposal memory proposal = Proposal({
            name: _name,
            approved: false,
            approvalCount: 0,
            contractAddress: address(0),
            owner: msg.sender,
            approvedBy: new address[](0)
        });
        proposals.push(proposal);
        uint256 index = proposals.length - 1;
        bytes32 hash = getHash(_name);
        proposalToPosition[hash] = index;
        emit NewCampaignProposed(proposal.name, proposal.owner);
    }

    function verifyProposal(bytes32 _name) public onlySuperVisorOrMember {
        bytes32 hash = getHash(_name);
        Proposal storage proposal = proposals[proposalToPosition[hash]];
        require(!isApprovedBy(_name), "Member already approved the proposal");
        require(!proposal.approved, "Proposal is already been approved!");
        proposal.approvalCount++;
        proposal.approvedBy.push(msg.sender);
        if (proposal.approvalCount > numOfMembers / 2) {
            proposal.approved = true;
            emit NewCampaignApproved(
                proposal.name,
                proposal.approvalCount,
                proposal.owner
            );
        }
        if (msg.sender == superVisor)
            superVisorInfo[superVisor].lastActive = uint64(block.timestamp);
    }

    function startCampaign(
        bytes32 _name,
        uint256 _startFrom,
        uint256 _endsIn,
        bytes32[] memory _candidates
    ) public onlyCampaignOwner(_name) {
        require(
            getProposalInfo(_name).approved,
            "Can not start an unapproved campaign"
        );
        Campaign campaignInstance = new Campaign(
            address(this),
            _startFrom,
            _endsIn,
            _candidates
        );
        bytes32 hash = getHash(_name);
        Proposal storage proposal = proposals[proposalToPosition[hash]];
        proposal.contractAddress = address(campaignInstance);
        emit NewCampaignStarted(
            proposal.name,
            proposal.contractAddress,
            proposal.owner
        );
    }

    function delegateCampaign(bytes32 _campaignName, address _to)
        external
        onlyCampaignOwner(_campaignName)
    {
        bytes32 hash = getHash(_campaignName);
        Proposal storage proposal = proposals[proposalToPosition[hash]];
        proposal.owner = _to;
        emit CampaignDelegated(proposal.owner);
    }

    function getProposalInfo(bytes32 _name)
        public
        view
        returns (Proposal memory)
    {
        bytes32 hash = getHash(_name);
        return proposals[proposalToPosition[hash]];
    }

    function isApprovedBy(bytes32 _name) internal view returns (bool) {
        Proposal memory proposal = getProposalInfo(_name);
        for (uint256 i = 0; i < proposal.approvedBy.length; i++) {
            if (proposal.approvedBy[i] == msg.sender) return true;
        }
        return false;
    }
}
