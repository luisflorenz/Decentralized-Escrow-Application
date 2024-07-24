const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('Escrow', function () {
  let contract;
  let depositor;
  let beneficiary;
  let arbiter;
  const deposit = ethers.utils.parseEther('1');
  const timeout = 60 * 60 * 24; // 1 day

  beforeEach(async () => {
    depositor = ethers.provider.getSigner(0);
    beneficiary = ethers.provider.getSigner(1);
    arbiter = ethers.provider.getSigner(2);
    const Escrow = await ethers.getContractFactory('Escrow');
    contract = await Escrow.deploy(
      arbiter.getAddress(),
      beneficiary.getAddress(),
      timeout,
      {
        value: deposit,
      }
    );
    await contract.deployed();
  });

  it('should be funded initially', async function () {
    let balance = await ethers.provider.getBalance(contract.address);
    expect(balance).to.eq(deposit);
  });

  it('should allow additional deposits', async function () {
    const additionalDeposit = ethers.utils.parseEther('0.5');
    await contract.connect(depositor).deposit({ value: additionalDeposit });
    let balance = await ethers.provider.getBalance(contract.address);
    expect(balance).to.eq(deposit.add(additionalDeposit));
  });

  describe('after approval from address other than the arbiter', () => {
    it('should revert', async () => {
      await expect(contract.connect(beneficiary).approve()).to.be.revertedWith("Only arbiter can approve");
    });
  });

  describe('after approval from the arbiter', () => {
    it('should transfer balance to beneficiary', async () => {
      const before = await ethers.provider.getBalance(beneficiary.getAddress());
      const approveTxn = await contract.connect(arbiter).approve();
      await approveTxn.wait();
      const after = await ethers.provider.getBalance(beneficiary.getAddress());
      expect(after.sub(before)).to.eq(deposit);
    });
  });

  describe('cancellation by depositor', () => {
    it('should allow cancellation after timeout', async () => {
      // Increase the EVM time to simulate timeout
      await ethers.provider.send('evm_increaseTime', [timeout + 1]);
      await ethers.provider.send('evm_mine');

      const before = await ethers.provider.getBalance(depositor.getAddress());
      const cancelTxn = await contract.connect(depositor).cancel();
      await cancelTxn.wait();
      const after = await ethers.provider.getBalance(depositor.getAddress());
      expect(after.sub(before)).to.be.closeTo(deposit, ethers.utils.parseEther('0.01')); // Considering gas fees
    });

    it('should revert cancellation before timeout', async () => {
      await expect(contract.connect(depositor).cancel()).to.be.revertedWith("Timeout has not expired");
    });
  });
});
