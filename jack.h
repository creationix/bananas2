#ifndef JACK_H
#define JACK_H

#include <inttypes.h> // for intptr_t
#include <stddef.h>   // for size_t
#include <stdlib.h>   // for malloc
#include <string.h>   // for memcpy

#include <stdio.h>

typedef enum { false, true } bool;

typedef enum {
  // Inline value types that don't need garbage collection
  JACK_NIL_TYPE = 1, // Must always be non-zero for NULL terminated arrays to work.
  JACK_BOOLEAN_TYPE,
  JACK_INTEGER_TYPE,
  JACK_C_FUNCTION_TYPE,

  // Wrapped types that need garbage collection
  JACK_STRING_TYPE,
  JACK_LIST_TYPE,
  JACK_FUNCTION_TYPE,
} jack_type;

// API for writing bindings to the VM.
typedef struct jack_value (*jack_c_function_t) (struct jack_value *args);

// Universal type. Does
struct jack_value {
  const jack_type type;
  union {
    const intptr_t integer;
    const bool boolean;
    const jack_c_function_t c_function;
    const struct jack_string *string;
    const struct jack_list *list;
    const struct jack_function *function;
  } data;
};
typedef struct jack_value jack_value_t;

struct jack_string {
  int ref_count;
  char value[];
};

struct jack_list {
  int ref_count;
  jack_value_t value[];
};

struct jack_function {
  int ref_count;
  struct jack_scope *closure;
  // TODO: store argument names somehow
  jack_value_t value[];
};

union jack_gc {
  struct jack_string string;
  struct jack_list list;
  struct jack_function function;
};

struct jack_pair {
  const char* key;
  struct jack_value value;
};
typedef struct jack_pair jack_pair_t;

struct jack_scope {
  struct jack_scope *parent;
  struct jack_pair pairs[];
};
typedef struct jack_scope jack_scope_t;

jack_value_t jack_nil() {
  return (jack_value_t){JACK_NIL_TYPE, {0}};
}
jack_value_t jack_boolean(bool boolean) {
  return (jack_value_t){JACK_BOOLEAN_TYPE, {boolean}};
}
jack_value_t jack_integer(intptr_t integer) {
  return (jack_value_t){JACK_INTEGER_TYPE, {integer}};
}
jack_value_t jack_c_function(jack_c_function_t function) {
  return (jack_value_t){JACK_C_FUNCTION_TYPE, {(intptr_t)function}};
}

jack_value_t jack_new_string(const char string[]) {
  struct jack_string* gc;
  // Include null terminator
  size_t len = strlen(string) + 1;
  gc = malloc(sizeof(*gc) + len);
  gc->ref_count = 0;
  memcpy(gc->value, string, len);
  return (jack_value_t){JACK_STRING_TYPE, {(intptr_t)gc}};
}

jack_value_t jack_new_list(jack_value_t items[]) {
  struct jack_list* gc;
  size_t size, len = 0;
  while (items[len].type) { ++len; }
  // Include space for null terminator
  size = len * sizeof(jack_value_t) + sizeof(jack_type);
  gc = malloc(sizeof(*gc) + size);
  gc->ref_count = 0;
  memcpy(gc->value, items, size);
  return (jack_value_t){JACK_LIST_TYPE, {(intptr_t)gc}};
}

jack_value_t jack_new_function(jack_scope_t *closure, jack_value_t body[]) {
  struct jack_function* gc;
  size_t size, len = 0;
  while (body[len].type) { ++len; }
  // Include space for null terminator
  size = len * sizeof(jack_value_t) + sizeof(jack_type);
  gc = malloc(sizeof(*gc) + size);
  gc->ref_count = 0;
  gc->closure = closure;
  // TODO: store argument names somehow
  memcpy(gc->value, body, size);
  return (jack_value_t){JACK_FUNCTION_TYPE, {(intptr_t)gc}};
}

jack_scope_t* jack_new_scope(jack_scope_t* parent, jack_pair_t pairs[]) {
  jack_scope_t* scope;
  size_t size, len = 0;
  while (pairs[len].key) { ++len; }
  // Include extra space for null terminator.
  size = len * sizeof(jack_pair_t) + sizeof(char*);
  scope = malloc(sizeof(*scope) + size);
  scope->parent = parent;
  memcpy(scope->pairs, pairs, size);
  return scope;
}

#endif
