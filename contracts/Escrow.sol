// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract Escrow {
		address public arbiter;
		address public beneficiary;
		address public depositor;
		uint256 public depositAmount;
		bool public isApproved;
		uint256 public timeout;
		bool public isCancelled;

		event Deposited(address indexed depositor, uint256 amount);
		event Approved(address indexed arbiter, uint256 amount);
		event Cancelled(address indexed depositor, uint256 amount);

		modifier onlyArbiter() {
				require(msg.sender == arbiter, "Only arbiter can approve");
				_;
		}

		modifier onlyDepositor() {
				require(msg.sender == depositor, "Only depositor can cancel");
				_;
		}

		constructor(address _arbiter, address _beneficiary, uint256 _timeout) payable {
				arbiter = _arbiter;
				beneficiary = _beneficiary;
				depositor = msg.sender;
				depositAmount = msg.value;
				timeout = block.timestamp + _timeout;
		}

		function deposit() external payable {
				require(!isApproved, "Escrow already approved");
				require(!isCancelled, "Escrow is cancelled");
				depositAmount += msg.value;
				emit Deposited(msg.sender, msg.value);
		}

		function approve() external onlyArbiter {
				require(!isApproved, "Already approved");
				require(!isCancelled, "Escrow is cancelled");
				isApproved = true;
				payable(beneficiary).transfer(depositAmount);
				emit Approved(msg.sender, depositAmount);
		}

		function cancel() external onlyDepositor {
				require(!isApproved, "Already approved");
				require(!isCancelled, "Escrow already cancelled");
				require(block.timestamp > timeout, "Timeout has not expired");
				isCancelled = true;
				payable(depositor).transfer(depositAmount);
				emit Cancelled(msg.sender, depositAmount);
		}
}