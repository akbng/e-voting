// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract Campaign {
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
        for (uint256 i = 0; i < _names.length && i < 10; i++) {
            candidates.push(Candidate({name: _names[i], voteCount: 0}));
        }
    }

    event VoterVerified(Voter voter);
    event VoterApproved(address indexed voterAddress);

    // user needs to apply for voting before the voting starts
    // some authority might would approve them after that they can vote
    // otherwise there will vote spamming all over the place
    function applyVoter() public {
        require(!votingEnded(), "Cannot apply after voting has ended");
        require(!votingStarted(), "Cannot apply after voting has started");
        votersList.push(msg.sender);
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
