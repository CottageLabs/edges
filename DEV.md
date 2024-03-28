# Developer Information

All contributions to Edges must follow these standards and procedures

## Coding Standards

1. Vanilla javascript, except convenience utility methods, which use jquery
2. SCSS for styles, no embedded display styles in HTML
3. Use library utilities wherever they are present, and add general utilities if they are needed
4. Module structure should be handled by extending the `edges` global, using the following style in the top of each file to declare modules extensibly:

```javascript
if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("components")) { edges.components = {}}
```

and so forth.

5. Classes and functions should be declared using modern class/function style by writing them into the module structure
directly.  TitleCase for classes, camelCase for functions.  For example

```javascript
edges.components.MyComponent = class extends edges.Component {
    constructor(params) {
        
    }
}
```

and either of:

```javascript
edges.util.myFunction = function (params) {}
edges.util.myOtherFunction = () => {}
```

6. All classes and html IDs specific to edges should be namespaced to the component or renderer using them.  Generic classes may
be used from UI frameworks (e.g. bootstrap).  For example:

```javascript
<div id="edges-my_component-4" class="edges-my_component-container"></div>
```

where `edges-my_component` is a unique namespace for the component.

7. Classes used for style and classes used for js event bindings should be marked as such.  Utility functions are provided.

These functions produce the appropriate classes to attach to a DOM element.

```javascript
edges.util.styleClasses
edges.util.jsClasses
edges.util.allClasses
```

This function provides html IDs appropriately escaped and namespaced

```javascript
edges.util.htmlID
```

This function allows you to generate selectors which can read elements by their classes

```javascript
edges.util.jsClassSelector
```

8. Follow the appropriate model structure, do not introduce new structural or architectural elements.

9. No project-specific code should be added to edges.  Edges needs to provide as-generic-as-possible capabilities that
can be adapted by projects as needed.  Therefore, something your project needs that is unique to it shouldn't be part
of the edges library, your project should override or otherwise extend the core code.

That said, edges expands and grows by the addition of new code that is required by projects it is used in.  Therefore,
if the code you are adding is completely novel, and does not modify any existing code in a project-specific way, then
it may be suitable to include for use later by other projects.

If you need a project-specific version of edges you should fork the code or create a `client/*` branch.


## Developer Procedures

1. For all development on `develop` and `master` use standard gitflow procedures.  That is:
    * hotfixes on a `hotfix` branch made from `master`
    * features on a `feature` branch made from `develop`
2. For all development on earlier versions of edges, also use the standard gitflow procedures, but you will need to apply
them manuaully, as the gitflow utility won't do it for you.  Namespace your branches so it is clear later on which branch
they apply to.  For example:
    * hotfix to `edges1` should be `hotfix/edges1/branch_name`
    * feature for `edges1` should be `feature/edges1/branch_name`
3. Beyond the branching conventions above, branches should be named as follows: `{issue number}_{description}` where
`{issue_number}` is the issue number in the edges issue tracker https://github.com/CottageLabs/edges/issues
If an issue number isn't available (e.g. this is a general update coming from working on other projects, then just
a description of the issue is sufficient)
4. All changes should be entered as PRs, and another developer on the project should review, referencing the coding
standards above

## General Guidelines

When adding code to edges, be mindful of the following things. This is a general library in use by multiple projects.  Any changes you make may impact those projects.
As such consider the following during development:

1. Any changes to the existing code should be switchable, and be off by default
2. Don't change any existing default behaviour, instead add new options to behaviours
3. Major changes may imply the need for a new version of a component to sit alongside the older version

When using edges, you should take a cut of the project into your codebase, ideally using a git submodule, and pin yourself
to a specific commit, so you are not affected by upstream changes.  If you want to upgrade you should review the
changes in the branch carefully and ensure that they do not change the behaviour of your application.

