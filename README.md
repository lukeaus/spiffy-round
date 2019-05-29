# <img src="media/logo.png" title="Spiffy Round" alt="Spiffy Round logo" width="530">

[![Tests](https://img.shields.io/travis/lukeaus/spiffy-round/master.svg)](https://travis-ci.org/lukeaus/spiffy-round)
[![MIT License](https://img.shields.io/npm/l/spiffy-round.svg)](https://github.com/lukeaus/spiffy-round/blob/master/LICENSE)
[![version](https://img.shields.io/npm/v/spiffy-round.svg)](http://npm.im/spiffy-round)
[![downloads](https://img.shields.io/npm/dm/spiffy-round.svg)](http://npm-stat.com/charts.html?package=spiffy-round&from=2018-07-24)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## What

Spiffy/smart rounding for numbers.
Returns string (so you can have a consistent number of decimal places).

## Why

Consistent, user friendly friendly formatted numbers.
See examples below.

## API

### spiffyRound(value[, decimal places])

#### value

Type: Number/String

#### decimal places

Type: Number

Default: 0

Description: Number of desired decimal places (only applies if decimals are not all 0's)

## Installation

`npm install --save spiffy-round`

## Usage

```javascript
const spiffyRound = require("spiffy-round");

// value type Number
spiffyRound(1.2); // '1'
spiffyRound(1.2, 1); // '1.2'
spiffyRound(1.2, 2); // '1.20'
spiffyRound(1.256, 2); // '1.26'
spiffyRound(1, 2); // '1'
spiffyRound(0.0, 2); // '0'
spiffyRound(1.0, 2); // '1'
spiffyRound(-1.0, 2); // '-1'
spiffyRound(+0); // '0'
spiffyRound(-0); // '0'
spiffyRound(+1.006, 2); // '1.01'
spiffyRound(-1.006, 2); // '-1.01'

// value type String
spiffyRound("1.2"); // '1'
spiffyRound("1.2", 1); // '1.2'
spiffyRound("1.2", 2); // '1.20'
spiffyRound("1.256", 2); // '1.26'
spiffyRound("1", 2); // '1'
spiffyRound("0.000", 2); // '0'
spiffyRound("1.00", 2); // '1'
spiffyRound("-1.00", 2); // '-1'
spiffyRound("+0"); // '0'
spiffyRound("-0"); // '0'
spiffyRound("+1.006", 2); // '1.01'
spiffyRound("-1.006", 2); // '-1.01'
```

## ToDo

- handle exponents
- handle alternate decimal separator ','

## Contributing

Contributions are welcomed. How to make a contribution:

- Create an issue on Github
- Fork project
- Make changes then use `npm run commit` to commit
- Create a pull request
