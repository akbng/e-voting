// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./Base.sol";

abstract contract ReportingSystem is Base {
    event SuperVisorRemovalRequested(SuperVisor superVisor);
    event SuperVisorRemoved(address oldSuperVisor, address newSuperVisor);
    event InactiveSuperVisorDemoted(
        address oldSuperVisor,
        address newSuperVisor
    );

    function reportMember(address _user)
        public
        noMemberAllowed
        noSuperVisorAllowed
    {
        require(isMember(_user), "reported user is not a member");
        memberInfo[_user].reports++;
    }

    function reportSuperVisor(address _user)
        public
        noMemberAllowed
        noSuperVisorAllowed
    {
        require(isSuperVisor(_user), "reported user is not the superVisor");
        superVisorInfo[superVisor].reports++;
    }

    function requestSuperVisorRemoval() public onlyMember {
        // todo: remove comment while migrating
        //* this is commented out for testing purposes
        // require(superVisorInfo[superVisor].reports > 99, "Reports against superVisor too low");
        require(
            !isRemoveSuperVisorRequested(),
            "Member already requested superVisor removal"
        );
        SuperVisor storage superVisorDetails = superVisorInfo[superVisor];
        superVisorDetails.removeRequest++;
        superVisorDetails.removeRequestedBy.push(msg.sender);
        emit SuperVisorRemovalRequested(superVisorDetails);
    }

    function isRemoveSuperVisorRequested() internal view returns (bool) {
        SuperVisor memory superVisorDetails = superVisorInfo[superVisor];
        for (
            uint256 i = 0;
            i < superVisorDetails.removeRequestedBy.length;
            i++
        ) {
            if (superVisorDetails.removeRequestedBy[i] == msg.sender)
                return true;
        }
        return false;
    }

    function removeSuperVisorByVote() public onlyMember {
        address oldSuperVisor = superVisor;
        SuperVisor memory superVisorDetails = superVisorInfo[superVisor];
        require(
            superVisorDetails.removeRequest > numOfMembers / 2,
            "not enough vote"
        );
        removeSuperVisor();
        emit SuperVisorRemoved(oldSuperVisor, superVisor);
    }

    function requestMemberRemoval(address _member) public onlyMember {
        require(
            isMember(_member),
            "provided address does not belong to a member"
        );
        require(
            !isMemberRemoved(_member),
            "provided member is already removed"
        );
        require(
            !isRemoveMemberRequested(_member),
            "Member already requested for removal"
        );
        Member storage member = memberInfo[_member];
        member.removeRequest++;
        member.removeRequestedBy.push(msg.sender);
        if (member.removeRequest > numOfMembers / 2) {
            remove(getMemberIndex(_member));
        }
    }

    function isRemoveMemberRequested(address _member)
        internal
        view
        returns (bool)
    {
        Member memory member = memberInfo[_member];
        for (uint256 i = 0; i < member.removeRequestedBy.length; i++) {
            if (member.removeRequestedBy[i] == msg.sender) return true;
        }
        return false;
    }

    function isMemberRemoved(address _member) public view returns (bool) {
        require(
            isMember(_member),
            "provided address does not belong to a member"
        );
        return memberInfo[_member].removed;
    }

    function removeInactiveSuperVisor() public {
        require(isSuperVisorInactive(), "Can not remove active superVisor");
        address oldSuperVisor = superVisor;
        demoteSuperVisor();
        emit InactiveSuperVisorDemoted(oldSuperVisor, superVisor);
    }

    function isSuperVisorInactive() public view returns (bool) {
        return
            block.timestamp - superVisorInfo[superVisor].lastActive > 30 days;
    }
}
