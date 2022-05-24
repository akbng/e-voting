const { assert } = require("chai");
const casual = require("casual");

const generateAddresses = (length) =>
  new Array(length)
    .fill("")
    .map((_) => web3.eth.accounts.create())
    .map(({ address }) => address);

const addresses = generateAddresses(5);

const getHex = (string) => web3.utils.stringToHex(string);
const getStringFromHex = (hex) => web3.utils.hexToString(hex);

const candidateNames = new Array(10).fill("").map((_) => casual.full_name);
const candidateHex = candidateNames.map((candidate) => getHex(candidate));

const currentTime = ~~(Date.now() / 10 ** 3); // ~~ is similar to Math.floor

const shouldThrow = async (promise, reason) => {
  try {
    await promise;
    assert(true);
  } catch (e) {
    return reason && expect(e.reason).to.equal(reason);
  }
  assert(false, "Did not throw");
};

module.exports = {
  addresses,
  getHex,
  getStringFromHex,
  candidateNames,
  candidateHex,
  currentTime,
  shouldThrow,
  generateAddresses,
};
