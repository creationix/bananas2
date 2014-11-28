"use strict";

var p = require('./modules/utils.js').prettyPrint;

var read = require('./read.js');
var write = require('./write.js');
var evaluate = require('./eval.js');

var stdin = uv.new_tty(0, true);
var stdout = uv.new_tty(1, false);

// Create a local scope with nothing in it.
var scope = Object.create(evaluate.stdlib);

uv.read_start(stdin, function (err, data) {
  if (err) { throw err; }
  if (!data) {
    uv.read_stop(stdin);
    uv.write(stdout, "bye!\n");
    return;
  }
  var code = data.toString();
  var ast = read(code);
  var result;
  ast.forEach(function (expression) {
    p("in", expression, scope);
    result = evaluate(scope, expression);
    p("out", result, scope);
  });
  if (result.constant !== null) {
    uv.write(stdout, write(result) + "\n> ");
  }
  else {
    uv.write(stdout, "> ");
  }
});

uv.write(stdout, "> ");
uv.run();
