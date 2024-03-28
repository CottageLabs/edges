# Migrating edges2 to edges3 classes

Some of the components in this library still use the edges 2 code format, and will not work
with edges 3.  They need to be upgraded.  This can be done as follows:

## General instructions for all files

1. Add the declarations to the top of the file for ensuring the global variables exist.

For example, to add a component, you will want the declaration:

```javascript
if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("components")) { edges.components = {}}
```

2. Add the requirements documentation at the top of the file.  You can see the requirements by looking at the `import` statements from the original code.

For example, if the code requires just the edges core and the edges utils, you can enter

```javascript
// requires: edges
// requires: edges.util
```

3. Update the class definition.  Classes should be defined as follows, for example for a component:

```javascript
edges.components.MyComponent = class extends edges.Component {}
```

4. Review all the `import` statements, and ensure that the functions are properly referenced where they are used.

For example, if the import says

```javascript
import {getParam, styleClasses} from "../../utils";
```

Then all instances of `getParam` should be replaced with `edges.util.getParam` and all instances of `styleClasses`
should be replaced with `edges.util.styleClasses`.

5. Remove all the old `import` statements


## Additional instructions for Renderers

If the renderer already has an `scss` file in `sass/renderers` (or one of the subdirectories) which is properly
formatted as per the instructions below, then you don't need to do any more.

If no such file exists, you will need to source the original CSS from the `edges1` branch.  If it doesn't exist there
then it means this component was project-specific, and you may need to look in the project code to find the basic
CSS.

Once you have the original CSS, do the following:

1. Create the appropriate scss file in a suitable place in the tree.  Tree structure for css is `sass/renderers/[css type]/[renderer name, lowercase with hyphens].scss`

For example, for a renderer called the `ChartDataTable` for it to render using Bootstrap 5, the scss should live in 
`sass/renderers/bs5/chart-data-table.scss`

2. At the top of the file, add a short bit of documentation for which renderer/purpose of the css

3. Define the renderer css namespace, as defined by the renderer class.

For example, if the component namespace is `edges-bs3-search-controller` then define this as `$ns` in this file using

```sass
$ns:".edges-bs3-search-controller";
```

4. Copy in the original styles

5. Replace every instance of the namespace with the `$ns` substitution.

For example, if the css directive is `.edges-bs3-multidaterangecombineselector_label { }` You can replace this with `#{$ns}_label`

6. Reformat any CSS you like to take advantage of the SASS capabilities