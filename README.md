# ☕ Depercolator

Opinionated custom script to convert Coffee codebase to JS. Inspired by [bugsnag/depercolator](https://github.com/bugsnag/depercolator)

## Prerequisities

Make sure you change the following before converting your codebase.

### Using `this` before super

```coffee
class B extends A
  constructor: (@options) ->
    super options

# this would compile in coffee to using this before super which is not allowed in JS
```

Instead rewrite it as

```coffee
class A extends B
  constructor: (options) ->
    super options
    @options = options
```

### Using fat arror functions `=>` to bind class methods

```coffee
class B extends A
  constructor: (@options) ->
    super options

  doStuff: () =>
    ...

# this would compile in coffee to using this before super which is not allowed in JS
```

Instead rewrite it as

```coffee
class A extends B
  constructor: (options) ->
    super options
    @options = options
    @doStuff = @doStuff.bind @

  doStuff: () ->
    ...

# Also consider whether you actually need to bind, in most cases just switching to -> is enough
```

### Remove object constructor `{} =`

```coffee
doStuff = () ->
  return {} =
    a: 5
    b: 8
```

Instead write as

```coffee
doStuff = () ->
  return
    a: 5
    b: 8
```

### Remove shadowing variables

Shadowing variables are incorectly converted and the inner varibale tries to override the outer scope even though they are in different scopes in coffeescript.

```coffee
out = _.map [1, 2, 3], (item) ->
  out = item * 2
  out
```

Instead write as

```coffee
out = _.map [1, 2, 3], (item) ->
  result = item * 2
  result
```

### Remove same variable names in inner scopes

If you use same variable names in inner scope of a function as in the outer scope, decaffenaite will incorectly convert this case, see the sample:

```coffee
out = _.map [1, 2, 3], (item) ->
    out = item * 2
    out
```

Will get converted incorrectly to

```js
// Broken code!
var out = _.map([1, 2, 3], function(item) {
  out = item * 2;
  return out;
});

// Fixed code
var out = _.map([1, 2, 3], function(item) {
  var out = item * 2;
  return out;
});
```

## Usage

Clone the repository

```bash
git clone https://github.com/AlesMenzel/depercolator.git
```

Install dependencies

```bash
cd depercolator && npm install
```

Run against a directory

```bash
node index.js /path/to/project
```

## Options

| Parameter | Description                |
| --------- | -------------------------- |
| -d        | Do NOT delete Coffee files |

## Used packages/transformations

- [cjsx-codemod](https://github.com/jsdf/cjsx-codemod)
- [decoffenaite](https://github.com/decaffeinate/decaffeinate)
- [jscodeshift](https://github.com/facebook/jscodeshift)
- [react-codemods](https://github.com/reactjs/react-codemod)
- [babel](https://github.com/babel/babel) and presets/plugins
- [eslint](https://github.com/eslint/eslint) and presets/plugins
- [prettier](https://github.com/prettier/prettier)
- [rimraf](https://github.com/isaacs/rimraf)

## How the conversion proccess works

1. Converts all cJSX files to use React.createElement
2. Converts all Coffee files to JS files
3. Remove .coffee extension from require()
4. Converts React.createClass to ES6 classes
5. Converts React.createElement back to JSX
6. Converts to more modern JS syntax (no var, template literals, object assign to spread, arrow functions instead of bind)
7. Runs prettier (ESLint unfortunatelly breaks the code with babel 7)
8. Runs rimraf and removes all Coffee files
