// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";

import {Treasury} from "../src/Treasury.sol";
import {LiquiditySeeder} from "../src/LiquiditySeeder.sol";

contract InitPoolAndSeedScript is Script {
    uint256 private constant DEFAULT_ETH_AMOUNT = 0.1 ether;
    uint256 private constant DEFAULT_USDC_AMOUNT = 300_000_000; // 300 USDC (6 decimals)
    int256 private constant DEFAULT_INITIAL_TICK = 80040; // ~3000 USDC/ETH
    uint256 private constant DEFAULT_TICK_RANGE = 6000;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address treasuryAddress = vm.envAddress("TREASURY");
        Treasury treasury = Treasury(payable(treasuryAddress));

        IPoolManager poolManager = treasury.poolManager();
        PoolKey memory poolKey = treasury.poolKey();

        int24 tickSpacing = poolKey.tickSpacing;
        int24 initialTick = _floorToSpacing(int24(vm.envOr("INITIAL_TICK", DEFAULT_INITIAL_TICK)), tickSpacing);

        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(initialTick);

        uint256 ethAmount = vm.envOr("ETH_AMOUNT_WEI", DEFAULT_ETH_AMOUNT);
        uint256 usdcAmount = vm.envOr("USDC_AMOUNT", DEFAULT_USDC_AMOUNT);
        uint256 tickRange = vm.envOr("TICK_RANGE", DEFAULT_TICK_RANGE);

        int24 tickLower = _floorToSpacing(initialTick - int24(int256(tickRange)), tickSpacing);
        int24 tickUpper = _floorToSpacing(initialTick + int24(int256(tickRange)), tickSpacing);
        tickLower = _clamp(tickLower, TickMath.minUsableTick(tickSpacing), TickMath.maxUsableTick(tickSpacing));
        tickUpper = _clamp(tickUpper, TickMath.minUsableTick(tickSpacing), TickMath.maxUsableTick(tickSpacing));

        if (tickLower >= tickUpper) revert("InitPoolAndSeed: invalid tick range");

        (uint128 amount0Desired, uint128 amount1Desired, uint256 msgValue) =
            _mapAmounts(poolKey, ethAmount, usdcAmount);

        vm.startBroadcast(deployerKey);

        try poolManager.initialize(poolKey, sqrtPriceX96) {} catch {}

        LiquiditySeeder seeder = new LiquiditySeeder(poolManager);

        if (!poolKey.currency0.isAddressZero()) {
            IERC20Minimal(Currency.unwrap(poolKey.currency0)).approve(address(seeder), amount0Desired);
        }
        if (!poolKey.currency1.isAddressZero()) {
            IERC20Minimal(Currency.unwrap(poolKey.currency1)).approve(address(seeder), amount1Desired);
        }

        seeder.seedLiquidity{value: msgValue}(
            poolKey,
            tickLower,
            tickUpper,
            amount0Desired,
            amount1Desired,
            "",
            deployer
        );

        vm.stopBroadcast();
    }

    function _mapAmounts(PoolKey memory key, uint256 ethAmount, uint256 usdcAmount)
        private
        pure
        returns (uint128 amount0Desired, uint128 amount1Desired, uint256 msgValue)
    {
        if (key.currency0.isAddressZero()) {
            amount0Desired = uint128(ethAmount);
            amount1Desired = uint128(usdcAmount);
            msgValue = ethAmount;
            return (amount0Desired, amount1Desired, msgValue);
        }
        if (key.currency1.isAddressZero()) {
            amount0Desired = uint128(usdcAmount);
            amount1Desired = uint128(ethAmount);
            msgValue = ethAmount;
            return (amount0Desired, amount1Desired, msgValue);
        }
        revert("InitPoolAndSeed: pool is not native paired");
    }

    function _floorToSpacing(int24 tick, int24 spacing) private pure returns (int24) {
        int24 compressed = tick / spacing;
        if (tick < 0 && tick % spacing != 0) compressed -= 1;
        return compressed * spacing;
    }

    function _clamp(int24 tick, int24 minTick, int24 maxTick) private pure returns (int24) {
        if (tick < minTick) return minTick;
        if (tick > maxTick) return maxTick;
        return tick;
    }
}
