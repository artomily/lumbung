// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {LumbungVault} from "../src/LumbungVault.sol";

contract DeployScript is Script {
    // Default Arc Testnet & Mainnet ERC-20 USDC interface address
    address constant DEFAULT_USDC = 0x3600000000000000000000000000000000000000;

    function run() external returns (LumbungVault vault) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address ownerAddress = vm.envAddress("OWNER_ADDRESS");
        address agentAddress = vm.envAddress("CIRCLE_AGENT_WALLET_ADDRESS");
        address usdcAddress = vm.envOr("USDC_ADDRESS", DEFAULT_USDC);

        console.log("Deploying LumbungVault with parameters:");
        console.log("- Owner:", ownerAddress);
        console.log("- Agent:", agentAddress);
        console.log("- USDC:", usdcAddress);

        vm.startBroadcast(deployerPrivateKey);
        vault = new LumbungVault(ownerAddress, agentAddress, usdcAddress);
        vm.stopBroadcast();

        console.log("LumbungVault deployed at:", address(vault));
    }
}
