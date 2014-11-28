"use strict";

function Value(){}
Constant.prototype.__proto__ = Value.prototype;
Id.prototype.__proto__ = Value.prototype;
List.prototype.__proto__ = Value.prototype;
Function.prototype.__proto__ = Value.prototype;

function assert(expr, message) {
  if (expr) { return; }
  throw new Error(message || "Assertion failed");
}

// Map from interned constants to wrapped objects.
var constantKeys = [];
var constantValues = [];
function Constant(value) {
  var index = constantKeys.indexOf(value);
  if (index >= 0) {
    return constantValues[index];
  }
  constantKeys.push(value);
  constantValues.push(this);
  this.value = value;
  this.string = JSON.stringify(value);
}
Constant.prototype.toString = function () {
  return this.string;
};
Constant.prototype.valueOf = function () {
  return this.value;
};

var idCache = {};
function Id(name) {
  var cached = idCache[name];
  if (cached) { return cached; }
  this.name = name;
}
Id.prototype.toString = function () {
  return this.name;
};

function List() {
  this.list = [];
  this.keys = [];
  this.values = [];
}
List.prototype.set = function (key, value) {
  assert(key instanceof Value);
  assert(value instanceof Value);
  var index;
  if (key instanceof Constant && typeof key.value === "number") {
    index = key.value|0;
    if (index === key.value && index <= this.list.length && index >= 0) {
      return (this.list[index] = value);
    }
  }
  index = this.keys.indexOf(key);
  if (index >= 0) {
    return (this.values[index] = value);
  }
  this.keys.push(key);
  this.values.push(value);
  return value;
};

List.prototype.push = function (value) {
  assert(value instanceof Value);
  this.list.push(value);
  return value;
};

List.prototype.unshift = function (value) {
  assert(value instanceof Value);
  this.list.unshift(value);
  return value;
};

List.prototype.splice = function (index, number) {
  return this.list.splice(index, number);
};

List.prototype.pop = function () {
  if (this.list.length > 0) {
    return this.list.pop();
  }
  return new Constant(null);
};

List.prototype.get = function (key) {
  assert(key instanceof Value);
  var index;
  if (key instanceof Constant && typeof key.value === "number") {
    index = key.value|0;
    if (index === key.value && index <= this.list.length && index >= 0) {
      return this.list[index];
    }
  }
  index = this.keys.indexOf(key);
  if (index >= 0) {
    return this.values[index];
  }
  return new Constant(null);
};

var isBinop = {
  "+": true,
  "-": true,
  "/": true,
  "*": true,
  "%": true,
  "<": true,
  "<=": true,
  ">": true,
  ">=": true,
  "=": true,
  "!=": true,
};

List.prototype.toString = function () {
  var ll = this.list.length;
  var kl = this.keys.length;
  var parts = new Array(ll + kl);
  for (var i = 0; i < ll; ++i) {
    parts[i] = this.list[i].toString();
  }
  for (i = 0; i < kl; ++i) {
    parts[i + ll] = this.keys[i].toString() + ": " + this.values[i].toString();
  }
  if (parts[0] === "list") {
    return "[" + parts.slice(1).join(" ") + "]";
  }
  if (parts.length === 3 && this.list.length === 3 && isBinop[parts[0]]) {
    return "{" + parts[1] + " " + parts[0] + " " + parts[2] + "}";
  }
  return "(" + parts.join(" ") + ")";
};



var p = require('./modules/utils.js').prettyPrint;

// var tim = new List();
// tim.set(new Id("name"), new Constant("Tim"));
// tim.set(new Id("age"), new Constant(32));

// var jack = new List();
// jack.set(new Id("name"), new Constant("Jack"));
// jack.set(new Id("age"), new Constant(8));

// var family = new List();
// family.set(tim, new Constant(true));
// family.set(jack, new Constant(true));

// p(family);
// print(family.toString());

// var code = new List();
// code.push(new Id("print"));
// code.push(new Constant("Hello World"));

// p(code);
// print(code.toString());

// var list = new List();
// list.push(new Id("list"));
// list.push(new Constant(1));
// list.push(new Constant(2));
// list.push(new Constant(3));

// p(list);
// print(list.toString());

var openers = {
  "{": "}",
  "(": ")",
  "[": "]",
};
var closers = {
  "}": "{",
  ")": "(",
  "]": "[",
};

function syntaxError(code, offset, message) {
  var start, end;
  start = end = offset;
  while (start && code[start] !== "\n") { --start; }
  while (end < code.length && code[end] !== "\n") { ++end; }
  if (code[start] === "\n") { ++start; }
  message += "\n" + code.substring(start, end) + "\n";
  for (var i = 0, l = offset - start; i < l; ++i) {
    message += " ";
  }
  message += "^";
  return new SyntaxError(message);
}

// Given code returns an ast for a single expression and extra data as a string
// Returns undefined when it needs more data.
// Throws an error on invalid input.
function parse(code, offset) {
  var current;
  var stack = [];
  var expectStack = [];

  while (offset < code.length) {
    var part, match, token;

    part = code.substring(offset);

    // Ignore whitespace and comments
    if ((match = part.match(/^(?:\s+|--.*)/))) {
      offset += match[0].length;
      continue;
    }

    // Match constant literals
    else if ((match =
        part.match(/^(?:"(?:[^"\\]|\\.)*")/) ||
        part.match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE]-?[1-9][0-9]*)?/) ||
        part.match(/^(?:true|false|null)\b/)
    )) {
      token = new Constant(JSON.parse(match[0]));
    }

    // Match identifiers
    else if ((match = part.match(/^[^\s()[\]{}",'`:;#|\\]+/))) {
      token = new Id(match[0]);
    }

    if (match) {
      offset += match[0].length;
      // Toplevel IDs and Constants emit directly
      if (!current) {
        return [
          token,
          offset,
        ];
      }
      var top = expectStack[expectStack.length - 1];
      if (top instanceof Value) {
        expectStack.pop();
        current.set(id, token);
      }
      else {
        current.push(token);
      }
      continue;
    }

    // Handle list openers
    if (part[0] in openers) {
      stack.push(current);
      expectStack.push(openers[part[0]]);
      current = new List();
      ++offset;
    }

    // And list closers
    else if (part[0] in closers) {
      var expected = expectStack.pop();
      if (expected !== part[0]) {
        throw syntaxError(code, offset, expected ?
          "Expected " + expected + " but found " + part[0] :
          "Unexpected " + part[0]);
      }
      var value = current;
      if (part[0] === "]") {
        value.unshift(new Id("list"));
      }
      else if (part[0] === "}") {
        if (part.length !== 3) {
          throw syntaxError(code, offset, "Infix requires exactly 3 items");
        }
        value.unshift(value.splice(1, 1)[0]);
      }
      current = stack.pop();
      ++offset;
      if (!current) {
        return [
          value,
          offset,
        ];
      }
      current.push(value);
    }

    // And map separators
    else if (current && part[0] === ":") {
      var id = current.pop();
      if (!id instanceof Value) {
        throw syntaxError(code, offset, "Expected value before colon");
      }
      ++offset;
      expectStack.push(id);
    }

    // Everything else is an error
    else {
      throw syntaxError(code, offset, "Unexpected character");
    }
  }
}


function evaluate(scope, value) {
  if (value instanceof Constant || value instanceof Function) {
    return value;
  }
  if (value instanceof Id) {
    var parts = value.name.split(".");
    var ret = scope;
    for (var i = 0, l = parts.length; i < l; ++i) {
      p(1, ret)
      ret = ret.get(new Id(parts[i]));
      p(2, ret)
      if (ret === new Constant(null)) {
        break;
      }
    }
    return ret;
  }

  if (!value.list.length) {
    throw new Error("Can't eval empty list");
  }

  var fn = evaluate(scope, value.get(0));
  if (typeof fn !== "function") {
    throw new TypeError("First item must resolve to a function");
  }
  var args = value.slice(1);
  if (!fn.raw) {
    args = args.map(function (arg) {
      return evaluate(scope, arg);
    });
  }
  return fn(scope, args);
}


var stdin = uv.new_tty(0, true);
var stdout = uv.new_tty(1, false);
var stderr = uv.new_tty(2, false);

var code = "";
var offset = 0;
var scope = new List();
scope.set(new Id("print"), function (scope, args) {
  print(args.map(function (arg) {
    return arg.toString();
  }).join(" "));
});

uv.read_start(stdin, onRead);

function onRead(err, chunk) {
  if (err) { throw err; }
  uv.read_stop(stdin);
  if (!chunk) {
    uv.write(stderr, "\nBye!\n");
    return;
  }
  code += chunk.toString();
  var next, value;
  try {
    while ((next = parse(code, offset))) {
      value = next[0];
      value = evaluate(scope, value);
      offset = next[1];
    }
    if (code.substring(offset).trim() === "") {
      uv.write(stdout, value.toString() + "\n");
      code = "";
      offset = 0;
    }
  }
  catch (error) {
    uv.write(stderr, error.stack + "\n");
    code = "";
    offset = 0;
  }

  uv.write(stdout, code.length ? "* " : "> ");

  uv.read_start(stdin, onRead);
}
uv.write(stdout, "> ");

uv.read_start(stdin, onRead);
uv.run();
