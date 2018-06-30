# ☕ Depercolator

Opionated custom script to convert Coffee codebase to JS. Inspired by [bugsnag/depercolator](https://github.com/bugsnag/depercolator)

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
