// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
    function decimals() external view returns (uint8);
}

library ECDSAUtils {
    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "invalid sig length");
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) {
            v += 27;
        }
        return ecrecover(hash, v, r, s);
    }
}

contract ConditionalEscrow {
    address public owner;
    IERC20 public usdc;
    address public oracle; // oracle public address used for signed events

    struct Agreement {
        address creator; // who created/deposited
        address[] recipients;
        uint256[] amounts;
        uint256 totalAmount;
        uint256 deadline;
        bytes32 conditionHash; // commitment to condition (off-chain description)
        bool executed;
    }

    mapping(bytes32 => Agreement) public agreements;

    event AgreementCreated(bytes32 indexed id, address indexed creator, uint256 totalAmount);
    event AgreementExecuted(bytes32 indexed id);

    constructor(address _usdc, address _oracle) {
        owner = msg.sender;
        usdc = IERC20(_usdc);
        oracle = _oracle;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "zero");
        require(usdc.transferFrom(msg.sender, address(this), amount), "transfer failed");
    }

    function createAgreement(
        bytes32 id,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256 deadline,
        bytes32 conditionHash
    ) external {
        require(agreements[id].totalAmount == 0, "agreement exists");
        require(recipients.length == amounts.length, "len mismatch");
        uint256 sum = 0;
        for (uint i = 0; i < amounts.length; i++) sum += amounts[i];
        agreements[id] = Agreement(msg.sender, recipients, amounts, sum, deadline, conditionHash, false);
        emit AgreementCreated(id, msg.sender, sum);
    }

    // oracleMessage: keccak256(abi.encodePacked(id, successFlag, recipients, amounts)) signed by oracle
    function executeAgreement(bytes32 id, bytes calldata oracleSig) external {
        Agreement storage ag = agreements[id];
        require(!ag.executed, "already executed");
        require(block.timestamp <= ag.deadline, "deadline passed");
        require(ag.totalAmount > 0, "no agreement");

        // Recreate message hash
        bytes32 msgHash = keccak256(abi.encodePacked(id, ag.recipients, ag.amounts));
        bytes32 ethPrefixed = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
        address signer = ECDSAUtils.recover(ethPrefixed, oracleSig);
        require(signer == oracle, "bad oracle sig");

        // transfer to recipients
        ag.executed = true;
        for (uint i = 0; i < ag.recipients.length; i++) {
            require(usdc.transfer(ag.recipients[i], ag.amounts[i]), "transfer failed");
        }
        emit AgreementExecuted(id);
    }

    // cancel by creator before execution
    function cancelAgreement(bytes32 id) external {
        Agreement storage ag = agreements[id];
        require(ag.creator == msg.sender, "not creator");
        require(!ag.executed, "already");
        delete agreements[id];
    }

    // admin helper to change oracle
    function setOracle(address newOracle) external {
        require(msg.sender == owner, "only owner");
        oracle = newOracle;
    }
}