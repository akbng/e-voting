// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./VotingSystem.sol";
import "./ReportingSystem.sol";
import "./PraisalSystem.sol";

contract E_Voting is VotingSystem, ReportingSystem, PraisingSystem {
    constructor(address[] memory commissionMembers) Base(commissionMembers) {}
}
