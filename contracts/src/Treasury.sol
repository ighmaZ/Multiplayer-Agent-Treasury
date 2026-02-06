// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "openzeppelin-contracts/access/AccessControl.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";
import {V4Router} from "@uniswap/v4-periphery/src/V4Router.sol";
import {IV4Router} from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {ActionConstants} from "@uniswap/v4-periphery/src/libraries/ActionConstants.sol";
import {ReentrancyLock} from "@uniswap/v4-periphery/src/base/ReentrancyLock.sol";

/// @notice Treasury contract that swaps into USDC via Uniswap v4 and pays invoices.
contract Treasury is V4Router, ReentrancyLock, AccessControl {
    using CurrencyLibrary for Currency;

    bytes32 public constant TREASURY_ADMIN_ROLE = keccak256("TREASURY_ADMIN_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    Currency public immutable usdc;
    PoolKey public poolKey;

    event PoolKeyUpdated(Currency currency0, Currency currency1, uint24 fee, int24 tickSpacing, address hooks);
    event InvoicePaid(address indexed recipient, uint256 usdcAmount, bool swapped);

    error InvalidPoolKey();
    error InvalidPayer(address payer);
    error InvalidRecipient();

    constructor(
        IPoolManager manager,
        Currency usdcCurrency,
        PoolKey memory initialPoolKey,
        address admin,
        address agent
    ) V4Router(manager) {
        usdc = usdcCurrency;
        poolKey = initialPoolKey;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ADMIN_ROLE, admin);

        _setRoleAdmin(AGENT_ROLE, TREASURY_ADMIN_ROLE);
        if (agent != address(0)) _grantRole(AGENT_ROLE, agent);
    }

    receive() external payable {}

    function setPoolKey(PoolKey memory newPoolKey) external onlyRole(TREASURY_ADMIN_ROLE) {
        poolKey = newPoolKey;
        emit PoolKeyUpdated(
            newPoolKey.currency0,
            newPoolKey.currency1,
            newPoolKey.fee,
            newPoolKey.tickSpacing,
            address(newPoolKey.hooks)
        );
    }

    function setAgent(address agent, bool enabled) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (enabled) {
            _grantRole(AGENT_ROLE, agent);
        } else {
            _revokeRole(AGENT_ROLE, agent);
        }
    }

    /// @notice Pays an invoice directly from USDC balance without swapping.
    function payInvoiceUSDC(address recipient, uint256 amount) external onlyRole(AGENT_ROLE) {
        if (recipient == address(0)) revert InvalidRecipient();
        usdc.transfer(recipient, amount);
        emit InvoicePaid(recipient, amount, false);
    }

    /// @notice Swap from the non-USDC side of the pool into USDC and pay the recipient.
    /// @dev The swap is executed as exact output to make the max USDC limit enforceable by the hook.
    function swapToUsdcExactOutAndPay(
        uint128 usdcAmountOut,
        uint128 maxAmountIn,
        address recipient,
        bytes calldata hookData
    ) external onlyRole(AGENT_ROLE) isNotLocked {
        if (recipient == address(0)) revert InvalidRecipient();

        (bool zeroForOne, Currency currencyIn, Currency currencyOut) = _usdcSwapDirection();

        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_OUT_SINGLE),
            uint8(Actions.SETTLE),
            uint8(Actions.TAKE)
        );

        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            IV4Router.ExactOutputSingleParams({
                poolKey: poolKey,
                zeroForOne: zeroForOne,
                amountOut: usdcAmountOut,
                amountInMaximum: maxAmountIn,
                hookData: hookData
            })
        );
        params[1] = abi.encode(currencyIn, uint256(ActionConstants.OPEN_DELTA), false);
        params[2] = abi.encode(currencyOut, recipient, uint256(ActionConstants.OPEN_DELTA));

        _executeActions(abi.encode(actions, params));

        emit InvoicePaid(recipient, usdcAmountOut, true);
    }

    /// @inheritdoc V4Router
    function msgSender() public view override returns (address) {
        return _getLocker();
    }

    /// @inheritdoc V4Router
    function _pay(Currency token, address payer, uint256 amount) internal override {
        if (payer != address(this)) revert InvalidPayer(payer);
        token.transfer(address(poolManager), amount);
    }

    function _usdcSwapDirection() internal view returns (bool zeroForOne, Currency currencyIn, Currency currencyOut) {
        Currency currency0 = poolKey.currency0;
        Currency currency1 = poolKey.currency1;

        if (Currency.unwrap(currency0) == Currency.unwrap(usdc)) {
            zeroForOne = false;
            currencyIn = currency1;
            currencyOut = currency0;
            return (zeroForOne, currencyIn, currencyOut);
        }

        if (Currency.unwrap(currency1) == Currency.unwrap(usdc)) {
            zeroForOne = true;
            currencyIn = currency0;
            currencyOut = currency1;
            return (zeroForOne, currencyIn, currencyOut);
        }

        revert InvalidPoolKey();
    }
}
