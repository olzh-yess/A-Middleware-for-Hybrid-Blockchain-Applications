### The public blockchain
Let the owner deploy the BatcherAccountable first: 

```
constructor() payable {
    require(
        msg.value == 0 ether,
        "Must send 1 ETH to initialize BatcherAccountable"
    );
    depositFunds = msg.value;
    _owner = msg.sender;
    enroll(msg.sender);
}
```

This instantiates a ProxyAccount for the owner. Pass it to the ThanksPaySalaryToken as the owner address (since owner's actions will be routed through the ThanksPaySalaryToken as well).


### The private blockchain

Here, just pass the actual owner address. 