// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ConditionalEscrow} from "../src/ConditionalEscrow.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

contract ConditionalEscrowTest is Test {
    MockUSDC usdc;
    ConditionalEscrow escrow;

    address depositor;
    address recipient1;
    address recipient2;

    uint256 oraclePk;
    address oracleAddr;

    function setUp() public {
        usdc = new MockUSDC();

        depositor = makeAddr("depositor");
        recipient1 = makeAddr("recipient1");
        recipient2 = makeAddr("recipient2");

        // deterministic oracle private key for testing
        oraclePk = 0xA11CE; // arbitrary small pk for test
        oracleAddr = vm.addr(oraclePk);

        escrow = new ConditionalEscrow(address(usdc), oracleAddr);

        // fund depositor
        usdc.mint(depositor, 1_000_000_000); // 1,000 USDC with 6 decimals
        // approve escrow to pull funds
        vm.prank(depositor);
        usdc.approve(address(escrow), 1_000_000_000);
    }

    function testCreateAndExecuteAgreement() public {
        // deposit into escrow
        vm.prank(depositor);
        escrow.deposit(300_000_000); // 300 USDC

        // create agreement
        bytes32 id = keccak256(abi.encodePacked("agreement-1"));
        address[] memory recipients = new address[](2);
        recipients[0] = recipient1;
        recipients[1] = recipient2;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100_000_000; // 100 USDC
        amounts[1] = 200_000_000; // 200 USDC
        uint256 deadline = block.timestamp + 1 days;
        bytes32 conditionHash = keccak256(abi.encodePacked("deliver report"));

        escrow.createAgreement(id, recipients, amounts, deadline, conditionHash);

        // build oracle signature over prefixed msgHash
        bytes32 msgHash = keccak256(abi.encodePacked(id, recipients, amounts));
        bytes32 prefixed = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oraclePk, prefixed);
        bytes memory sig = abi.encodePacked(r, s, v);

        // execute agreement
        escrow.executeAgreement(id, sig);

        assertEq(usdc.balanceOf(recipient1), 100_000_000);
        assertEq(usdc.balanceOf(recipient2), 200_000_000);
    }

    function testExecuteRevertsWithBadOracle() public {
        vm.prank(depositor);
        escrow.deposit(100_000_000);

        bytes32 id = keccak256(abi.encodePacked("agreement-2"));
        address[] memory recipients = new address[](1);
        recipients[0] = recipient1;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100_000_000;
        uint256 deadline = block.timestamp + 1 days;
        bytes32 conditionHash = keccak256(abi.encodePacked("condition"));

        escrow.createAgreement(id, recipients, amounts, deadline, conditionHash);

        bytes32 msgHash = keccak256(abi.encodePacked(id, recipients, amounts));
        bytes32 prefixed = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));

        // sign with wrong pk
        uint256 wrongPk = 0xBEEF;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPk, prefixed);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.expectRevert(bytes("bad oracle sig"));
        escrow.executeAgreement(id, sig);
    }
}