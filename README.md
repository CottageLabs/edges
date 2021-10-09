# Edges

2.0 Upgrade README TODO

## Build

Edges uses Parcel to build.  There are a number of build options, depending on your desired environment.

### Client library

If you want to use Edges as a client-only library, you can compile it so the library and all its resources
are available to you in an `edges` global variable.

To compile for this environment use:

```bash
npm run build-client
```

This will output `dist/client/edges.js` which you can use in an HTML page in the usual way:

```html
<script src="edges.js"></script>
```

Note that if you compile Edges this way it **will not** include jQuery or the Elasticsearch dependencies in the
package, you will be required to include them yourself, for example:

```html
<script src="jquery.js"></script>
<script src="es1x.js"></script>
<script src="edges.js"></script>
```

You will probably want to compile your own Elasticsearch dependency, see the relevant section below for that.

### ES Module

If you want a module that is importable using the standard NPM approach, build as follows:

```bash
npm run build-module
```

This will output `dist/module/edges.js` which can be used in standard import statements.


### Development Server

To build edges using the Demo application under the demo server you can use

```bash
npm run demo-serve
```

This will compile the demo application and make it available at http://localhost:3000


### Stand-alone demo

To see the demo application running as a pure client side application, outside the parcel server, use

```bash
npm run demo-standalone
```

This will compile `edges.js` and `es1x.js` and place them in the `view` directory along with jQuery, such that
the file `demo-standalone.html` can be opened directly in your browser.


### Elasticsearch dependencies

If you are building for the client, you will need to import the elasticsearch binding dependencies in your HTML file.

To do this, you will need to build the appropriate binding for your environment.  You can use:

```bash
npm run build-es1x
```

This will compile the ES 1.x binding library to `dist/es1x/es1x.js`.  You can then include this file in a `script`
tag as normal:

```html
<script src="es1x.js"></script>
```

Note that this library has dependencies on jQuery which are not bundled, so you will also need to add a jQuery `script`
tag to your HTML page

```html
<script src="jquery.js"></script>
<script src="es1x.js"></script>
```

### Alternative build approaches

The `package.json` file contains a number of scripts that you can run to compile alternative versions of edges 
depending on your use case.  In particular it supports:

* Bundling jQuery: use `npm run jquery-bundled` to set the library up to build with jQuery bundled, then `npm run target-client`
to compile the client in that way.
* Bundling es bindings: use `npm run es1x` to set the library up to build with es1x support bundled, then `npm run target-client` 
to compile the client in that way
  
You can combine bundling external libraries any way you wish, and then compile the appropriate target to give you the
desired build.


## Building a project on Edges

(Experimental, work in progress)

1. Set up `nvm` and `nvm use` your preferred node version
2. Create your project directory, with `src`, `view`, `vendor` and `sass` folders (empty at this stage)
3. Clone edges into the vendor directory as a submodule, and ensure that we are using the edges2 branch (FIXME, we'll need to change this later)

```bash
git submodule add git@github.com:CottageLabs/edges.git vendor/edges2
cd vendor/edges2
git checkout edges2
```

4. Initialise the project as a node package

```bash
npm init
```

Answer a bunch of questions to generate your `package.json`

5. Install the essentials for building with parcel and edges

```bash
npm i -D parcel sass @babel/core @babel/plugin-transform-runtime
npm i @babel/runtime-corejs2 @parcel/transformer-sass jquery
```

6. Go into `package.json` and in `devDependencies` change `"parcel" : "*"` to `"parcel" : "latest"`

7. Create `.babelrc` in the root, and fill it as follows:

```json
{
  "plugins": [
    [
      "@babel/plugin-transform-runtime",
      {
        "corejs": 2,
        "regenerator": true
      }
    ]
  ]
}
```

8. Create `proxyrc.js` in the root and fill it as follows:

```js
module.exports = function (app) {
    app.use((req, res, next) => {
        res.removeHeader("Cross-Origin-Resource-Policy")
        res.removeHeader("Cross-Origin-Embedder-Policy")
        next()
    })
}
```

9. Create an initial build manifest HTML file in `views/[viewname].html` containing HTML structured as follows:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>[View Title]</title>
    <link rel="stylesheet" href="../sass/[viewname].scss" />
</head>
<body>

<div id="[viewname]"></div>

<script type="module" src="../src/[viewname].js"></script>

</body>
</html>
```

10. Create our initial sass file (empty at this stage) at `sass/[viewname].scss`

11. Create our entrypoint JS file (empty at this stage) at `src/[viewname].js`

12. Create scripts to run our application in development mode.  To do this we have to utilise some scripts that are
embedded in the edges `package.json` so we create the following 6 scripts in our `package.json`:
    
```json
{"scripts": {
  "clean": "rm -rf ./.parcel-cache && rm -rf ./dist",
  "jquery-external": "cd vendor/edges2 && npm run jquery-external && cd ../..",
  "jquery-bundled": "cd vendor/edges2 && npm run jquery-bundled && cd ../..",
  "es1x": "cd vendor/edges2 && npm run es1x && cd ../..",
  "es-external": "cd vendor/edges2 && npm run es-external dependencies/es.js && cd ../..",
  "serve-[viewname]": "npm run jquery-bundled && npm run es1x && npm run clean && parcel serve views/[viewname].html -p 8000"
}}
```

13. Create a production build target.  Add the following target to `package.json`:

```json
{
  "targets": {
    "[viewname]": {
      "source": "src/[viewname].js",
      "engines": {
        "browsers": "> 0.5%, last 2 versions, not dead"
      },
      "isLibrary": false,
      "optimize": false,
      "outputFormat": "global"
    }
  }
}
```

14. Create a production build script.  Add the following scripts to `package.json`:

```json
{
  "target-[viewname]" : "parcel build --target [viewname]",
  "build-[viewname]" : "npm run jquery-bundled && npm run es1x && npm run clean && npm run target-[viewname]"
}
```

15. Create an initial Edge instance in `[viewname].js` to get us started.  This would most likely be in the form:

```js
import Edge from "../vendor/edges2/src/core"

global.VIEWNAME = new Edge({
    selector: "#g001",
    searchUrl: "http://localhost:9200/doc/_search"
})

export default VIEWNAME;
```

16. Run your initial edge in dev mode

```bash
npm run serve-[viewname]
```

This should bring the dev server up at http://localhost:8000
