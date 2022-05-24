// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./Base.sol";

abstract contract PraisingSystem is Base {
    function praiseMember(address _user)
        public
        noMemberAllowed
        noSuperVisorAllowed
    {
        require(isMember(_user), "praised user is not a member");
        memberInfo[_user].reputation++;
    }
}
