import "hardhat/console.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
pragma solidity ^0.8.12;

contract TestContract {
    uint256 public test;

    constructor() {
        test = 0;
    }

    function incrementTest(uint256 number) public {
        test += 1;
    }

    function viewTest() public view returns (uint256) {
        return test;
    }
}
