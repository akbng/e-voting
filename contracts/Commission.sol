// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

// contract represents an election commission to verify voter applicants and other supervising
contract Commission {
    // structure of a member of the commission
    struct Member {
        uint64 reports;
        uint64 reputation;
        uint8 removeRequest;
        address[] removeRequestedBy;
        bool removed;
    }

    address[20] members;
    uint8 public numOfMembers;

    mapping(address => uint256) internal membersIndex;
    mapping(address => Member) internal memberInfo;

    constructor(address[] memory _members) {
        uint8 i;
        for (i = 0; i < _members.length; i++) {
            membersIndex[_members[i]] = i;
            members[i] = _members[i];
        }
        numOfMembers = i;
    }

    modifier onlyMember() {
        require(isMember(msg.sender), "Only members are allowed");
        _;
    }

    // member can transfer their membership to some other address
    function transferMembership(address _to) public onlyMember {
        uint256 index = getMemberIndex(msg.sender);
        members[index] = _to;
        membersIndex[_to] = index;
    }

    // function to remove a member
    function remove(uint256 index) internal {
        memberInfo[members[index]].removed = true;
        address lastMember = members[numOfMembers - 1];
        members[index] = lastMember;
        membersIndex[lastMember] = index;
        numOfMembers--;
    }

    function getMember(uint256 _index) public view returns (address) {
        return members[_index];
    }

    function getMemberInfo(address _user) public view returns (Member memory) {
        return memberInfo[_user];
    }

    function isMember(address _account) public view returns (bool) {
        return
            _account == members[getMemberIndex(_account)] &&
            !memberInfo[_account].removed;
    }

    function getMemberIndex(address _account) public view returns (uint256) {
        return membersIndex[_account];
    }

    function getAllMembers() external view returns (address[] memory) {
        address[] memory actualMembers = new address[](numOfMembers);
        for (uint8 i = 0; i < numOfMembers; i++) {
            actualMembers[i] = members[i];
        }
        return actualMembers;
    }

    function findMostTrustedMember() public view returns (uint256) {
        uint256 max = 0;
        uint256 index;
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            if (memberInfo[member].reputation > max) {
                max = memberInfo[member].reputation;
                index = i;
            }
        }
        return index;
    }
}
