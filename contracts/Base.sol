// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./Commission.sol";

contract Base is Commission {
    // structure of a single election campaign proposal
    struct Proposal {
        bytes32 name;
        bool approved;
        uint8 approvalCount;
        address contractAddress;
        address superVisor;
        address[] approvedBy;
    }

    // structure of the ultimate member who is accountable for everything
    struct SuperVisor {
        uint64 reports;
        uint64 lastActive;
        uint8 removeRequest;
        address[] removeRequestedBy;
        bool removed;
    }

    Proposal[] public proposals;
    mapping(bytes32 => uint256) proposalToPosition;

    address public superVisor;
    mapping(address => SuperVisor) ownerInfo;

    constructor(address[] memory commissionMembers)
        Commission(commissionMembers)
    {
        superVisor = msg.sender;
        ownerInfo[superVisor].lastActive = uint64(block.timestamp);
    }

    modifier onlySuperVisor() {
        require(
            isSuperVisor(msg.sender),
            "Only the superVisor of the system is allowed"
        );
        _;
    }

    modifier onlySuperVisorOrMember() {
        require(
            isMember(msg.sender) || isSuperVisor(msg.sender),
            "Only members or the superVisor is allowed"
        );
        _;
    }

    modifier noMemberAllowed() {
        require(!isMember(msg.sender), "Members are not allowed");
        _;
    }

    modifier noSuperVisorAllowed() {
        require(!isSuperVisor(msg.sender), "SuperVisor is not allowed");
        _;
    }

    function delegateSystemSuperVisorship(address _to) external onlySuperVisor {
        superVisor = _to;
    }

    // only the super visor can add member to the commission
    function addMembers(address _member) public onlySuperVisor {
        require(!isMember(_member), "Member already exist");
        require(numOfMembers < 20, "Maximum number of members already exist");
        members[numOfMembers] = _member;
        membersIndex[_member] = numOfMembers;
        numOfMembers++;
        ownerInfo[superVisor].lastActive = uint64(block.timestamp);
    }

    // only the super visor can remove member from the commission given certain condition is satisfied
    function removeMember(address _user) public onlySuperVisor {
        require(isMember(_user), "provided user is not a member");
        Member memory member = memberInfo[_user];
        require(member.reports > 0, "can not remove a member with no reports");
        require(
            member.reports > member.reputation,
            "can not remove a well reputed member"
        );
        ownerInfo[superVisor].lastActive = uint64(block.timestamp);
        remove(getMemberIndex(_user));
    }

    // internal function to remove the supervisor
    function removeSuperVisor() internal {
        ownerInfo[superVisor].removed = true;
        uint256 index = findMostTrustedMember();
        superVisor = getMember(index);
        remove(index);
    }

    // internal function to demote the supervisor
    function demoteSuperVisor() internal {
        ownerInfo[superVisor].removed = true;
        uint256 index = findMostTrustedMember();
        address trustedMember = getMember(index);
        memberInfo[trustedMember].removed = true;
        members[index] = superVisor;
        membersIndex[superVisor] = index;
        superVisor = trustedMember;
    }

    function isSuperVisor(address _user) public view returns (bool) {
        return _user == superVisor;
    }

    function getSuperVisorInfo() public view returns (SuperVisor memory) {
        return ownerInfo[superVisor];
    }

    function getHash(bytes32 _name) internal pure returns (bytes32) {
        return sha256(abi.encode(_name));
    }
}
