pragma solidity >=0.8.0 <0.9.0;

contract Counter {
    uint256 public count;

    function increment() public {
        count += 1;
    }
}