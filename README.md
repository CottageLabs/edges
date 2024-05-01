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

| Parameter        | Type                          | Definition                                                                                                                                                                                                                                                                                                 | Default value                 | Supported values | Required                               |
| ---------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------- | -------------------------------------- |
| selector         | string                        | ==selector== denotes the element ID that will be used by edges as a parent element ID to render all it's component and templates.                                                                                                                                                                          | body                          | -                | <code style="color : Green">Yes</code> |
| searchUrl        | string                        | ==searchUrl== is an endpoint which will respond to the queries from the database of your choice.                                                                                                                                                                                                           | false                         | -                | <code style="color : red">No</code>    |
| datatype         |                               |                                                                                                                                                                                                                                                                                                            | jsonp                         | jsnop            | <code style="color : red">No</code>    |
| preflightQueries | new es.Query({})              | ==preflightQueries== this feature allows you to query the data in advance of your primary query. These queries will retrieve data only once. <br> <br> The results generated by preflightQueries will be stored inside _**preflightResults**_                                                              | false                         | -                | <code style="color : red">No</code>    |
| baseQuery        | new Query({})                 | ==baseQuery== sets important rules that all other queries must follow. These rules are strict and can't be changed, ensuring that all queries work correctly and consistently in the software.                                                                                                             | false                         | -                | <code style="color : red">No</code>    |
| openingQuery     | new Query({})                 | ==openingQuery== acts as the starting point of your search. If you reset you search interface it will go back to the inital stage i.e to openingQuery                                                                                                                                                      | undefined or false            | -                | <code style="color : red">No</code>    |
| secondaryQueries | new es.Query({})              | ==secondaryQueries== will be executed after the primary query execution allowing you to fetch the results. <br> <br> The results will be stored inside _**secondaryResults**_ <br><br> And the actual secondary queries derived from secondaryQueries will be stored inside _**realisedSecondaryQueries**_ | flase                         | -                | <code style="color : red">No</code>    |
| secondaryUrls    | -                             | -                                                                                                                                                                                                                                                                                                          | -                             | -                | <code style="color : red">No</code>    |
| initialSearch    | boolean                       | ==initialSearch== this will init the process of searching in your application.                                                                                                                                                                                                                             | true                          | true/false       | <code style="color : red">No</code>    |
| staticFiles      | []staticFileObject            | ==staticFiles== you can load data from the static files. This data will be accessible to all the components.                                                                                                                                                                                               | []                            | -                | <code style="color : red">No</code>    |
| manageUrl        | boolean                       | ==manageUrl== this will sync your browser URL with your search URL.                                                                                                                                                                                                                                        | false                         | true/false       | <code style="color : red">No</code>    |
| urlQuerySource   | -                             | -                                                                                                                                                                                                                                                                                                          | -                             | -                | <code style="color : red">No</code>    |
| urlQueryOptions  | -                             | -                                                                                                                                                                                                                                                                                                          | -                             | -                | <code style="color : red">No</code>    |
| template         | new edges.Template            | ==template== allows use to set the layout for the the entire page. These template either can be edges template or a custom template created by user using edges.Template class.                                                                                                                            | false                         | -                | <code style="color : red">No</code>    |
| components       | []new edges.Component         | ==components== is a distinct element or module within a graphical user interface that serves a specific function or displays certain content. These components can be edges components or a custom components created by user using edges.Component class.                                                 | []                            | -                | <code style="color : red">No</code>    |
| queryAdapter     | new edges.es.ESQueryAdapter() | -                                                                                                                                                                                                                                                                                                          | new edges.es.ESQueryAdapter() | -                | <code style="color : red">No</code>    |
| callbacks        | -                             | -                                                                                                                                                                                                                                                                                                          | {}                            | -                | <code style="color : red">No</code>    |

</details>
