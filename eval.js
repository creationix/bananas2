"use strict";

var p = require('./modules/utils.js').prettyPrint;

module.exports = evaluate;

var stdlib = evaluate.stdlib = Object.create(null);

stdlib.list = list;

stdlib.lambda = lambda;
lambda.raw = true;

stdlib.def = def;
def.raw = true;

stdlib.import = imprt;
imprt.raw = true;

function evaluate(scope, value) {
  if (!Array.isArray(value)) {
    if (value.id) {
      var parts = value.id.split(".");
      var ret = scope;
      for (var i = 0, l = parts.length; i < l; ++i) {
        if (ret === undefined) {
          return {
            error: "Attempting to index null",
            offset: parts[i].offset
          };
        }
        ret = ret[parts[i]];
      }
      return ret !== undefined ? ret
                               : { constant: null, offset: value.offset };
    }
    return value;
  }
  if (value.length < 1) {
    return {
      error: "Can't eval empty list",
      offset: value.offset
    };
  }
  var fn = evaluate(scope, value[0]);
  if (typeof fn === "function") {
    var args = value.slice(1);
    if (!fn.raw) {
      args = args.map(function (arg) {
        return evaluate(scope, arg);
      });
    }
    var ret = fn(scope, args);
    if (!ret.offset) {
      ret.offset = value[0].offset;
    }
    return ret;
  }
  p(value, fn);
  return {
    error: "First list item must resolve to a function",
    offset: value[0].offset
  };
}

function list(scope, args) {
  return args;
}

function lambda(scope, args) {
  var body = args.slice(1);
  args = args[0];
  if (!Array.isArray(args)) {
    return {
      error: "expected arguments list",
      offset: args.offset
    };
  }
  for (var i = 0, l = args.length; i < l; ++i) {
    var arg = args[i];
    if (typeof arg.id !== "string") {
      return {
        error: "expected arguments list",
        offset: args.offset
      };
    }
  }
  return {
    names: args,
    body: body,
    offset: args[0].offset,
  };
}

function def(scope, args) {
  // Special case for (def (name, arg1, arg2) ...) syntax
  if (Array.isArray(args[0]) && args[0].length) {
    var fn = evaluate(scope, [
      def, args[0][0], [lambda, args[0].slice(1), args.slice(1)]
    ]);
    fn.name = args[0][0].id;
    return fn;
  }

  if (typeof args[0].id !== "string") {
    return {
      error: "first def arg must be variable name",
      offset: args[0].offset
    };
  }
  var name = args[0].id;
  var result = { constant: null, offset: args[0].offset };
  for (var i = 1, l = args.length; i < l; ++i) {
    result = evaluate(scope, args[i]);
  }
  var parts = name.split(".");
  for (i = 0, l = parts.length - 1; i < l; ++i) {
    scope = scope[parts[i]] || (scope[parts[i]] = {});
  }
  scope[parts[l]] = result;
  return result;
}

function imprt(scope, args) {
  for (var i = 0, l = args.length; i < l; ++i) {
    var arg = args[i];
    if (typeof arg.id !== "string") {
      return {
        error: "import requires names",
        offset: arg.offset
      };
    }
    var name = arg.id;
    if (!/^[a-z]+$/.test(name)) {
      return {
        error: "Illegal import name",
        offset: arg.offset
      };
    }
    var funcs = require('./stdlib/' + arg.id + '.js');
    for (var key in funcs) {
      scope[key] = funcs[key];
    }
  }
  return { constant: null };
}
