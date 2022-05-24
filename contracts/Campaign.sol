// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

interface CommissionInterface {
    function numOfMembers() external view returns (uint8);

    function isMember(address _account) external view returns (bool);

    function isSuperVisor(address _user) external view returns (bool);
}

contract Campaign {
    address CommissionAddress;

    // structure of the users who shall vote
    struct Voter {
        bool verified;
        bool hasVoted;
        uint8 voteTo;
        uint8 approvalCount;
        address[] approvedBy;
    }

    // structure of the candidates appearing for the election
    struct Candidate {
        bytes32 name;
        uint64 voteCount;
    }

    mapping(address => Voter) private _voters;
    address[] public votersList;

    Candidate[] public candidates;

    uint256 public endTime;
    uint256 public startTime;

    constructor(
        address _commission,
        uint256 _startFrom,
        uint256 _endsIn,
        bytes32[] memory _names
    ) {
        require(
            _endsIn > _startFrom,
            "Ending time should be less than starting time"
        );
        endTime = _endsIn * 1 seconds;
        startTime = _startFrom * 1 seconds;
        CommissionAddress = _commission;
        for (uint256 i = 0; i < _names.length && i < 10; i++) {
            candidates.push(Candidate({name: _names[i], voteCount: 0}));
        }
    }

    event VoterVerified(Voter voter);
    event VoterApproved(address indexed voterAddress);

    modifier onlyCommissionMemberOrSuperVisor() {
        require(
            isCommissionMember(msg.sender) ||
                isCommissionSuperVisor(msg.sender),
            "Only a member or owner can verify!"
        );
        _;
    }

    modifier ownerNotAllowed() {
        require(!isCommissionSuperVisor(msg.sender), "SuperVisor can not vote");
        _;
    }

    modifier membersNotAllowed() {
        require(!isCommissionMember(msg.sender), "Members can not vote");
        _;
    }

    function isCommissionSuperVisor(address _user) public view returns (bool) {
        CommissionInterface electionCommission = CommissionInterface(
            CommissionAddress
        );
        return electionCommission.isSuperVisor(_user);
    }

    function isCommissionMember(address _user) public view returns (bool) {
        CommissionInterface electionCommission = CommissionInterface(
            CommissionAddress
        );
        return electionCommission.isMember(_user);
    }

    function numOfCommissionMembers() public view returns (uint8) {
        CommissionInterface electionCommission = CommissionInterface(
            CommissionAddress
        );
        return electionCommission.numOfMembers();
    }

    // user needs to apply for voting before the voting starts
    // some authority might would approve them after that they can vote
    // otherwise there will vote spamming all over the place
    function applyVoter() public {
        require(!votingEnded(), "Cannot apply after voting has ended");
        require(!votingStarted(), "Cannot apply after voting has started");
        votersList.push(msg.sender);
    }

    // a voter application is approved only by the majority approval of the commission members
    function verifyVoter(address _voter)
        public
        onlyCommissionMemberOrSuperVisor
    {
        require(!votingEnded(), "Cannot verify after voting has ended");
        require(!isApprovedBy(_voter), "Member already verified the voter");
        require(
            !isCommissionMember(_voter),
            "Cannot verify a member as a voter"
        );
        require(
            !isCommissionSuperVisor(_voter),
            "Cannot verify the owner as a voter"
        );
        Voter storage voter = _voters[_voter];
        voter.approvalCount++;
        voter.approvedBy.push(msg.sender);
        emit VoterVerified(voter);
        if (voter.approvalCount > numOfCommissionMembers() / 2) {
            voter.verified = true;
            emit VoterApproved(_voter);
        }
    }

    // function to check if the member has already verified the voter or not
    function isApprovedBy(address _voter) internal view returns (bool) {
        Voter memory voter = _voters[_voter];
        for (uint256 i = 0; i < voter.approvedBy.length; i++) {
            if (voter.approvedBy[i] == msg.sender) return true;
        }
        return false;
    }

    // function to vote for a candidate
    function vote(uint8 _to) external ownerNotAllowed membersNotAllowed {
        require(votingStarted(), "Voting period has not started yet!");
        require(!votingEnded(), "Voting period has ended!");
        require(voterIsVerified(), "Voter has no right to vote");
        require(!voterHasVoted(), "Voter has already casted vote");
        Voter storage voter = _voters[msg.sender];
        voter.hasVoted = true;
        voter.voteTo = _to;
        candidates[_to].voteCount++;
    }

    // function to find the winner of the election
    function findWinner() public view returns (bytes32) {
        require(votingEnded(), "Can not find winner before voting ends");
        uint256 max = 0;
        bytes32 name;
        for (uint256 i = 0; i < candidates.length; i++) {
            Candidate memory candidate = candidates[i];
            if (candidate.voteCount > max) {
                max = candidate.voteCount;
                name = candidate.name;
            }
        }
        return name;
    }

    function getVotersList() external view returns (address[] memory) {
        return votersList;
    }

    function voterIsVerified() public view returns (bool) {
        return _voters[msg.sender].verified;
    }

    function voterHasVoted() public view returns (bool) {
        return _voters[msg.sender].hasVoted;
    }

    function votingStarted() public view returns (bool) {
        return block.timestamp > startTime;
    }

    function votingEnded() public view returns (bool) {
        return block.timestamp > endTime;
    }

    function getVoterInfo(address _user)
        public
        view
        returns (bool verified, bool hasVoted)
    {
        Voter memory voter = _voters[_user];
        verified = voter.verified;
        hasVoted = voter.hasVoted;
    }
}
