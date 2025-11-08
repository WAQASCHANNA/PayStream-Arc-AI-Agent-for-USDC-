// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ConditionalEscrow} from "../src/ConditionalEscrow.sol";

contract DeployScript is Script {
    function run() external {
        string memory rpc = vm.envString("RPC_URL");
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        address usdc = vm.envAddress("USDC_ADDRESS");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        new ConditionalEscrow(usdc, oracle);
        vm.stopBroadcast();
    }
}