// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {TransientStateLibrary} from "@uniswap/v4-core/src/libraries/TransientStateLibrary.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {SafeCallback} from "@uniswap/v4-periphery/src/base/SafeCallback.sol";
import {DeltaResolver} from "@uniswap/v4-periphery/src/base/DeltaResolver.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";

/// @notice One-shot helper to seed liquidity into a v4 pool.
contract LiquiditySeeder is SafeCallback, DeltaResolver {
    using CurrencyLibrary for Currency;
    using TransientStateLibrary for IPoolManager;
    using StateLibrary for IPoolManager;

    error InvalidRefundAddress();
    error InvalidMsgValue(uint256 expected, uint256 actual);
    error InvalidPayer(address payer);
    error ZeroLiquidity();

    struct SeedParams {
        PoolKey key;
        int24 tickLower;
        int24 tickUpper;
        uint128 amount0Desired;
        uint128 amount1Desired;
        bytes hookData;
        address refundTo;
    }

    constructor(IPoolManager manager) SafeCallback(manager) {}

    /// @notice Pull funds, add liquidity, and refund leftovers.
    function seedLiquidity(
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount0Desired,
        uint128 amount1Desired,
        bytes calldata hookData,
        address refundTo
    ) external payable {
        if (refundTo == address(0)) revert InvalidRefundAddress();

        uint256 expectedValue = 0;
        if (key.currency0.isAddressZero()) expectedValue += amount0Desired;
        if (key.currency1.isAddressZero()) expectedValue += amount1Desired;
        if (msg.value != expectedValue) revert InvalidMsgValue(expectedValue, msg.value);

        _pullToken(key.currency0, amount0Desired);
        _pullToken(key.currency1, amount1Desired);

        poolManager.unlock(
            abi.encode(
                SeedParams({
                    key: key,
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    amount0Desired: amount0Desired,
                    amount1Desired: amount1Desired,
                    hookData: hookData,
                    refundTo: refundTo
                })
            )
        );
    }

    function _unlockCallback(bytes calldata data) internal override returns (bytes memory) {
        SeedParams memory params = abi.decode(data, (SeedParams));

        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(params.key.toId());
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(params.tickLower),
            TickMath.getSqrtPriceAtTick(params.tickUpper),
            params.amount0Desired,
            params.amount1Desired
        );

        if (liquidity == 0) revert ZeroLiquidity();

        poolManager.modifyLiquidity(
            params.key,
            ModifyLiquidityParams({
                tickLower: params.tickLower,
                tickUpper: params.tickUpper,
                liquidityDelta: int256(uint256(liquidity)),
                salt: bytes32(0)
            }),
            params.hookData
        );

        _settleCurrency(params.key.currency0);
        _settleCurrency(params.key.currency1);

        _refund(params.key.currency0, params.refundTo);
        _refund(params.key.currency1, params.refundTo);

        return "";
    }

    function _pullToken(Currency currency, uint128 amount) private {
        if (amount == 0 || currency.isAddressZero()) return;
        IERC20Minimal(Currency.unwrap(currency)).transferFrom(msg.sender, address(this), amount);
    }

    function _settleCurrency(Currency currency) private {
        int256 delta = poolManager.currencyDelta(address(this), currency);
        if (delta < 0) {
            _settle(currency, address(this), uint256(-delta));
        } else if (delta > 0) {
            poolManager.take(currency, address(this), uint256(delta));
        }
    }

    function _refund(Currency currency, address refundTo) private {
        uint256 balance = currency.balanceOfSelf();
        if (balance > 0) currency.transfer(refundTo, balance);
    }

    function _pay(Currency token, address payer, uint256 amount) internal override {
        if (payer != address(this)) revert InvalidPayer(payer);
        token.transfer(address(poolManager), amount);
    }
}
