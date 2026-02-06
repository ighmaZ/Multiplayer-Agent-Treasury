// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "openzeppelin-contracts/access/AccessControl.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";

/// @notice Hook enforcing a max USDC output per swap.
contract TreasurySwapLimitHook is BaseHook, AccessControl {
    using BeforeSwapDeltaLibrary for BeforeSwapDelta;

    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN_ROLE");

    Currency public immutable usdc;
    uint256 public maxSwapUSDC;

    error SwapLimitExceeded(uint256 requestedUSDC, uint256 maxUSDC);

    constructor(IPoolManager manager, Currency usdcCurrency, uint256 maxSwapUSDC_, address admin)
        BaseHook(manager)
    {
        usdc = usdcCurrency;
        maxSwapUSDC = maxSwapUSDC_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RISK_ADMIN_ROLE, admin);
    }

    function setMaxSwapUSDC(uint256 newLimit) external onlyRole(RISK_ADMIN_ROLE) {
        maxSwapUSDC = newLimit;
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory permissions) {
        permissions.beforeSwap = true;
    }

    function _beforeSwap(address, PoolKey calldata key, SwapParams calldata params, bytes calldata)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        if (params.amountSpecified > 0) {
            Currency outputCurrency = params.zeroForOne ? key.currency1 : key.currency0;
            if (Currency.unwrap(outputCurrency) == Currency.unwrap(usdc)) {
                uint256 amountOut = uint256(params.amountSpecified);
                if (amountOut > maxSwapUSDC) revert SwapLimitExceeded(amountOut, maxSwapUSDC);
            }
        }

        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }
}
