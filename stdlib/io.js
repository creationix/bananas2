"use strict";
var write = require('../write.js');
var stdout = uv.new_tty(1, false);

function toString(value) {
  if (typeof value.constant === "string") {
    return value.constant;
  }
  return write(value);
}

exports.print = function print(scope, args) {
  uv.write(stdout, args.map(toString).join(" ") + "\n");
  return { constant: null };
};
