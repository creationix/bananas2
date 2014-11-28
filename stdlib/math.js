"use strict";

exports["+"] = function add(scope, args) {
  var sum = 0;
  for (var i = 0, l = args.length; i < l; ++i) {
    var arg = args[i];
    if (typeof arg.constant !== "number") {
      return {
        error: "+ only works with numbers",
        offset: arg.offset
      };
    }
    sum += arg.constant;
  }
  return {
    constant: sum | 0,
  };
};

exports["*"] = function mul(scope, args) {
  var sum = 1;
  for (var i = 0, l = args.length; i < l; ++i) {
    var arg = args[i];
    if (typeof arg.constant !== "number") {
      return {
        error: "* only works with numbers",
        offset: arg.offset
      };
    }
    sum *= arg.constant;
  }
  return {
    constant: sum | 0,
  };
};

exports["-"] = function sub(scope, args) {
  if (args.length !== 2) {
    return {
      error: "- requires exactly 2 arguments",
    };
  }
  var a = args[0].constant;
  var b = args[1].constant;
  if (typeof a !== "number" || typeof b !== "number") {
    return {
      error: "- requires numbers",
    };
  }
  return {
    constant: (a - b) | 0
  };
};

exports["/"] = function div(scope, args) {
  if (args.length !== 2) {
    return {
      error: "/ requires exactly 2 arguments",
    };
  }
  var a = args[0].constant;
  var b = args[1].constant;
  if (typeof a !== "number" || typeof b !== "number") {
    return {
      error: "/ requires numbers",
    };
  }
  return {
    constant: (a / b) | 0
  };
};

exports["%"] = function mod(scope, args) {
  if (args.length !== 2) {
    return {
      error: "% requires exactly 2 arguments",
    };
  }
  var a = args[0].constant;
  var b = args[1].constant;
  if (typeof a !== "number" || typeof b !== "number") {
    return {
      error: "% requires numbers",
    };
  }
  return {
    constant: (a % b) | 0
  };
};
