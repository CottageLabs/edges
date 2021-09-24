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
