# ☕ Depercolator

Opionated custom script to convert Coffee codebase to JS. Inspired by [bugsnag/depercolator](https://github.com/bugsnag/depercolator)

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

# Also consider whether you actually need to bind, in most cases just sswitching to -> is enough
```

### Remove object constructor `{} = `

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

1.  Converts all cJSX files to use React.createElement
1.  Converts all Coffee files to JS files
1.  Converts React.createClass to ES6 classes
1.  Converts React.createElement back to JSX
1.  Runs prettier (ESLint unfortunatelly breaks the code with babel 7)
1.  Runs rimraf and removes all Coffee files
