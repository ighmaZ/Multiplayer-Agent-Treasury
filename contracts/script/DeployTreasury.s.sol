// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {TreasurySwapLimitHook} from "../src/TreasurySwapLimitHook.sol";
import {Treasury} from "../src/Treasury.sol";

contract DeployTreasuryScript is Script {
    address private constant BASE_SEPOLIA_POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address private constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        IPoolManager poolManager = IPoolManager(vm.envOr("POOL_MANAGER", BASE_SEPOLIA_POOL_MANAGER));
        Currency usdc = Currency.wrap(vm.envOr("USDC", BASE_SEPOLIA_USDC));
        uint256 maxSwapUsdc = vm.envUint("MAX_SWAP_USDC");
        uint24 fee = uint24(vm.envUint("POOL_FEE"));
        int24 tickSpacing = int24(int256(vm.envUint("TICK_SPACING")));

        address admin = vm.envOr("ADMIN", deployer);
        address agent = vm.envOr("AGENT", address(0));

        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(poolManager, usdc, maxSwapUsdc, admin);

        (address hookAddress, bytes32 salt) =
            HookMiner.find(deployer, flags, type(TreasurySwapLimitHook).creationCode, constructorArgs);

        vm.startBroadcast(deployerKey);

        TreasurySwapLimitHook hook = new TreasurySwapLimitHook{salt: salt}(poolManager, usdc, maxSwapUsdc, admin);
        require(address(hook) == hookAddress, "DeployTreasury: hook address mismatch");

        (Currency currency0, Currency currency1) = _sortCurrencies(Currency.wrap(address(0)), usdc);
        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: IHooks(address(hook))
        });

        Treasury treasury = new Treasury(poolManager, usdc, poolKey, admin, agent);

        console2.log("Hook:", address(hook));
        console2.log("Treasury:", address(treasury));

        vm.stopBroadcast();
    }

    function _sortCurrencies(Currency a, Currency b) private pure returns (Currency, Currency) {
        if (Currency.unwrap(a) < Currency.unwrap(b)) {
            return (a, b);
        }
        return (b, a);
    }
}
