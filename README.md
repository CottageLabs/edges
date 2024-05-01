# Edges documentation

---

<details>
  <summary>Introduction</summary>

### Why edges?

Edges is a JavaScript framework for building user interfaces. It builds on top of standard JavaScript , JQuery, HTML and CSS and provides a declarative, component-based programming model that helps you efficiently develop user interfaces of any complexity.

### Features provided

-   **Data fetching from various sources**
    -   It supports data fetching from sources like _Elastic Search_, _Static Files_.
-   **Querying and filtering of data**
-   **Wide variety of components supported**
-   **Template support**
-   **Data reactivity**
    -   Edges automatically tracks JavaScript state changes and efficiently updates the DOM when changes happen.
-   **Creation of customized components or templates**
    -   You can either choose to use the templates and components provided by edges or you have the flexibility of creating your own components or templates.

#### Limitations and Dependencies.

##### Dependencies

Edges is also dependent on some external libraries and in the current version (edges v3) here is the list of all the dependencies.

1. JQuery: _3.6.0_
2. Bootstrap: _3.1.1_
3. D3: _3.5.17_

#### Limitations

-   You need to install all the dependencies and based on your needs you can import them.
-   Imports of Jquery and Bootstrap is mandatory.

#### Future support

-   Support for solr

> NOTE: You can find all the dependencies under the vendor folder, this is maintained by us to ensure easy imports its users.

</details>

---

<details open>
<summary> Quick start </summary>

#### Creating an edges application

In this example we will be looking how one can start using edges on their local system. Before we began make sure that you have installed the proper version of edges on your system.

==We will be using edges3==

```HTML
<head>
    <link
      rel="stylesheet"
      href="<path_to_edges_installation>/edges/vendor/bootstrap-3.3.1/css/bootstrap.min.css"
    />
</head>
<body>
    <!-- Section where the edges magic happens. We will be using edge_container div
    to display the data using edges -->
    <div class="container">
      <div class="row">
        <div class="col-xs-12">
          <div id="edge_container"></div>
        </div>
      </div>
    </div>

    <!-- All the necessary JS required by us -->
     <script
      type="text/javascript"
      src="<path_to_edges_installation>/edges/vendor/jquery-3.6.0/jquery-3.6.0.min.js"
    ></script>
    <script type="text/javascript" src="<path_to_edges_installation>/edges/src/edges.js"></script>
    <!-- Pointing towards the es file which will be used. We are using es 7+ version -->
    <script
      type="text/javascript"
      src="<path_to_edges_installation>/edges/src/datasources/es7x.js"
    ></script>

    <!-- Importing components from edges -->
    <script
      type="text/javascript"
      src="<path_to_edges_installation>/edges/src/components/RefiningANDTermSelector.js"
    ></script>

    <!-- Importing edges template -->
    <script
      type="text/javascript"
      src="<path_to_edges_installation>/edges/src/templates/bs3/Facetview.js"
    ></script>

    <!-- Importing renderers from edges -->
    <script
      type="text/javascript"
      src="<path_to_edges_installation>/edges/src/renderers/bs3/RefiningANDTermSelector.js"
    ></script>

    <!-- Importing files required by this html file -->
    <script type="text/javascript" src="<your_js_file>.js"></script>
    <script type="text/javascript">
      example.init({
        selector: "#edge_container",
        index: "<your_es_URL>",
      });
    </script>
</body>
```

```javascript
var example = {};
example.active = {};

example.init = (params) => {
	const selector = params.selector;
	const index = params.index;

	example.active[selector] = new edges.Edge({
		selector: selector,
		template: new edges.templates.bs3.Facetview(),
		searchUrl: `${index}/<query_URL>`,
		components: [
			new edges.components.RefiningANDTermSelector({
				id: "<uniqueID>",
				category: "facet",
				field: "<>",
				display: "Example title",
				renderer: new edges.renderers.bs3.RefiningANDTermSelector({
					open: true,
				}),
			}),
		],
	});
};
```

To declare edges you need to call the edges class using the syntax, there are multiple parameters supported by the edges class which you will be learning edges class section.

```js
new edges.Edge({});
```

</details>

---

<details open>
<summary> Edge class </summary>

### Edges class

Edges class acts as an entry for the declaration of edges for that program. The edges class can be called using the syntax

```js
new edges.Edges({});
```

Edges supports variety of parameters providing with the flexibility to interact with your data at any stage of the cycle.

Here is the list of all the parameters supported by the edge class.

> [!IMPORTANT]  
> The parameters are case-sensitive; use them exactly as specified in this document.

| Parameter | Type   | Definition                                                                                                                       | Required                               |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| selector  | string | ==selector== denotes the element ID that will be used by edges as a parent element ID to render all it's component and templates | <code style="color : Green">Yes</code> |

</details>
