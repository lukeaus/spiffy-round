const { expect } = require("chai");
const spiffyRound = require("./index.js");
const { fillUnfilledDecimalPlaces } = spiffyRound;

describe("fillUnfilledDecimalPlaces", () => {
  describe("2 decimal places", () => {
    it("should convert 1", () => {
      expect(fillUnfilledDecimalPlaces("1", 2)).to.equal("1.00");
    });
    it("should convert 1.", () => {
      expect(fillUnfilledDecimalPlaces("1.", 2)).to.equal("1.00");
    });
    it("should convert 1.0", () => {
      expect(fillUnfilledDecimalPlaces("1.0", 2)).to.equal("1.00");
    });
  });
});

describe("spiffyRound", () => {
  describe("value type Number", () => {
    describe("no decimalPlace arg", () => {
      it("should round 0", () => {
        expect(spiffyRound(0)).to.equal("0");
      });
      it("should round 1", () => {
        expect(spiffyRound(1)).to.equal("1");
      });
      it("should round 1.", () => {
        expect(spiffyRound(1.0)).to.equal("1");
      });
      it("should round 1.1", () => {
        expect(spiffyRound(1.1)).to.equal("1");
      });
      it("should round +1", () => {
        expect(spiffyRound(+1)).to.equal("1");
      });
      it("should round -1", () => {
        expect(spiffyRound(-1)).to.equal("-1");
      });
      it("should round +0", () => {
        expect(spiffyRound(+0)).to.equal("0");
      });
      it("should round -0", () => {
        expect(spiffyRound(-0)).to.equal("0");
      });
    });
    describe("2 decimal places", () => {
      it("should round 1", () => {
        expect(spiffyRound(1, 2)).to.equal("1");
      });
      it("should round 1.", () => {
        expect(spiffyRound(1.0, 2)).to.equal("1");
      });
      it("should round 1.1", () => {
        expect(spiffyRound(1.1, 2)).to.equal("1.10");
      });
      it("should round 1.100", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(1.1, 2)).to.equal("1.10");
      });
      it("should round .1", () => {
        expect(spiffyRound(0.1, 2)).to.equal("0.10");
      });
      it("should round 1.", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(1, 2)).to.equal("1");
      });
      it("should round 1.256", () => {
        expect(spiffyRound(1.256, 2)).to.equal("1.26");
      });
      it("should round 0.000", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(0.0, 2)).to.equal("0");
      });
      it("should round +1.000", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(+1.0, 2)).to.equal("1");
      });
      it("should round -1.000", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(-1.0, 2)).to.equal("-1");
      });
      it("should round 1.005", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(1.005, 2)).to.equal("1");
      });
      it("should round +1.005", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(+1.005, 2)).to.equal("1");
      });
      it("should round -1.005", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(-1.005, 2)).to.equal("-1");
      });
      it("should round 1.006", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(1.006, 2)).to.equal("1.01");
      });
      it("should round +1.006", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(+1.006, 2)).to.equal("1.01");
      });
      it("should round -1.006", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound(-1.006, 2)).to.equal("-1.01");
      });
    });
  });
  describe("value type String", () => {
    describe("no decimalPlace arg", () => {
      it("should round 0", () => {
        expect(spiffyRound("0")).to.equal("0");
      });
      it("should round 0.00", () => {
        expect(spiffyRound("0.00")).to.equal("0");
      });
      it("should round 1", () => {
        expect(spiffyRound("1")).to.equal("1");
      });
      it("should round 1.", () => {
        expect(spiffyRound("1.")).to.equal("1");
      });
      it("should round 1.1", () => {
        expect(spiffyRound("1.1")).to.equal("1");
      });
      it("should round .1", () => {
        expect(spiffyRound(".1")).to.equal("0");
      });
      it("should round +0", () => {
        expect(spiffyRound("+0")).to.equal("0");
      });
      it("should round -0", () => {
        expect(spiffyRound("-0")).to.equal("0");
      });
    });
    describe("2 decimal places", () => {
      it("should round 1", () => {
        expect(spiffyRound("1", 2)).to.equal("1");
      });
      it("should round 1.", () => {
        expect(spiffyRound("1.", 2)).to.equal("1");
      });
      it("should round 1.1", () => {
        expect(spiffyRound("1.1", 2)).to.equal("1.10");
      });
      it("should round 1.100", () => {
        expect(spiffyRound("1.100", 2)).to.equal("1.10");
      });
      it("should round .0", () => {
        expect(spiffyRound(".0", 2)).to.equal("0");
      });
      it("should round .1", () => {
        expect(spiffyRound(".1", 2)).to.equal("0.10");
      });
      it("should round 1.", () => {
        expect(spiffyRound("1.", 2)).to.equal("1");
      });
      it("should round 1.256", () => {
        expect(spiffyRound("1.256", 2)).to.equal("1.26");
      });
      it("should round 0.000", () => {
        expect(spiffyRound("0.000", 2)).to.equal("0");
      });
      it("should round +1.000", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound("+1.000", 2)).to.equal("1");
      });
      it("should round -1.000", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound("-1.000", 2)).to.equal("-1");
      });
      it("should round 1.005", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound("1.005", 2)).to.equal("1");
      });
      it("should round +1.005", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound("+1.005", 2)).to.equal("1");
      });
      it("should round -1.005", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound("-1.005", 2)).to.equal("-1");
      });
      it("should round 1.006", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound("1.006", 2)).to.equal("1.01");
      });
      it("should round +1.006", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound("+1.006", 2)).to.equal("1.01");
      });
      it("should round -1.006", () => {
        // eslint-disable-next-line prettier/prettier
        expect(spiffyRound("-1.006", 2)).to.equal("-1.01");
      });
    });
  });
  describe("value type undefined", () => {
    it("should round undefined", () => {
      expect(spiffyRound()).to.equal("");
    });
    it("should round arg undefined", () => {
      expect(spiffyRound(undefined)).to.equal("");
    });
  });
});
