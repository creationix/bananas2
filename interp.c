#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <inttypes.h>

#include "jack.h"

static jack_value_t jack_scope_get(jack_scope_t *scope, const char* key) {
  while (scope) {
    jack_pair_t *pair = scope->pairs;
    while (pair->key) {
      if (strcmp(key, pair->key) == 0) {
        return pair->value;
      }
      ++pair;
    }
    scope = scope->parent;
  }
  return (jack_value_t){0};
}

static bool jack_scope_set(jack_scope_t *scope, const char* key, jack_value_t value) {
  while (scope) {
    jack_pair_t *pair = scope->pairs;
    while (pair->key) {
      if (strcmp(key, pair->key) == 0) {
        // TODO unref old value if it was GCable
        pair->value = value;
        return true;
      }
      ++pair;
    }
    scope = scope->parent;
  }
  return false;
}

static int jack_print_value(jack_value_t value) {
  if (!value.type) {
    return printf("NO SUCH VALUE\n");
  }
  switch (value.type) {
    case JACK_NIL_TYPE:
      return printf("nil\n");
    case JACK_INTEGER_TYPE:
      return printf("integer: %"PRIiPTR"\n", value.data.integer);
    case JACK_BOOLEAN_TYPE:
      return printf("boolean: %s\n", value.data.boolean ? "true" : "false");
    case JACK_C_FUNCTION_TYPE:
      return printf("c_function: [native function %p]\n", value.data.c_function);

    case JACK_STRING_TYPE:
      return printf("string(%d) %s\n", value.data.string->ref_count, value.data.string->value);
    case JACK_LIST_TYPE:
      return printf("list(%d) %p\n", value.data.string->ref_count, value.data.list);
    case JACK_FUNCTION_TYPE:
      return printf("function(%d) %p\n", value.data.string->ref_count, value.data.function);
  }
}

int main(int argc, char** argv) {
  jack_scope_t *outer, *inner;
  outer = jack_new_scope(NULL, (jack_pair_t[]) {
    {"name", jack_new_string("Tim Caswell")},
    {"age", jack_integer(32)},
    {NULL}
  });
  inner = jack_new_scope(outer, (jack_pair_t[]) {
    {"programmer", jack_boolean(true)},
    {NULL}
  });

  const char* names[] = { "age", "name", "programmer", "other", NULL};

  int i = 0;
  const char* name;
  while ((name = names[i++])) {
    printf("%s = ", name);
    jack_print_value(jack_scope_get(inner, name));
    ++name;
  }

  jack_scope_set(inner, "programmer", jack_new_string("Sometimes"));
  jack_scope_set(inner, "name", jack_new_string("Jack"));

  i = 0;
  while ((name = names[i++])) {
    printf("%s = ", name);
    jack_print_value(jack_scope_get(inner, name));
    ++name;
  }

  for (i = 0; i < 0x10000000; ++i) {
    jack_scope_set(inner, "name", jack_new_string("BLOAT!"));
    jack_scope_set(inner, "age", jack_integer(i));
  }

  return 0;
}
