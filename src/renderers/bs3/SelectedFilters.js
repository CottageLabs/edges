// requires: $
// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs3")) { edges.renderers.bs3 = {}}

edges.renderers.bs3.SelectedFilters = class extends edges.Renderer {
    constructor(params) {
        super(params);

        this.showFilterField = edges.util.getParam(params, "showFilterField", true);

        this.allowRemove = edges.util.getParam(params, "allowRemove", true);

        this.showSearchString = edges.util.getParam(params, "showSearchString", false);

        this.ifNoFilters = edges.util.getParam(params, "ifNoFilters", false);

        this.namespace = "edges-bs3-selected-filters";
    }

    draw() {
        // for convenient short references
        var sf = this.component;
        var ns = this.namespace;

        // sort out the classes we are going to use
        var fieldClass = edges.util.styleClasses(ns, "field", this);
        var fieldNameClass = edges.util.styleClasses(ns, "fieldname", this);
        var valClass = edges.util.styleClasses(ns, "value", this);
        var relClass = edges.util.styleClasses(ns, "rel", this);
        var containerClass = edges.util.styleClasses(ns, "container", this);

        var filters = "";

        if (this.showSearchString && sf.searchString) {
            var field = sf.searchField;
            var text = sf.searchString;
            filters += '<span class="' + fieldClass + '">';
            if (field) {
                if (field in sf.fieldDisplays) {
                    field = sf.fieldDisplays[field];
                }
                filters += '<span class="' + fieldNameClass + '">' + field + ':</span>';
            }
            filters += '<span class="' + valClass + '">"' + text + '"</span>';
            filters += '</span>';
        }

        var fields = Object.keys(sf.mustFilters);
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            var def = sf.mustFilters[field];

            filters += '<span class="' + fieldClass + '">';
            if (this.showFilterField) {
                filters += '<span class="' + fieldNameClass + '">' + def.display + ':</span>';
            }

            for (var j = 0; j < def.values.length; j++) {
                var val = def.values[j];
                filters += '<span class="' + valClass + '">' + val.display + '</span>';

                // the remove block looks different, depending on the kind of filter to remove
                if (this.allowRemove) {
                    var removeClass = edges.util.allClasses(ns, "remove", this);
                    if (def.filter === "term" || def.filter === "terms") {
                        filters += '<a class="' + removeClass + '" data-bool="must" data-filter="' + def.filter + '" data-field="' + field + '" data-value="' + val.val + '" alt="Remove" title="Remove" href="#">';
                        filters += '<i class="glyphicon glyphicon-black glyphicon-remove"></i>';
                        filters += "</a>";
                    } else if (def.filter === "range") {
                        var from = val.from ? ' data-' + val.fromType + '="' + val.from + '" ' : "";
                        var to = val.to ? ' data-' + val.toType + '="' + val.to + '" ' : "";
                        filters += '<a class="' + removeClass + '" data-bool="must" data-filter="' + def.filter + '" data-field="' + field + '" ' + from + to + ' alt="Remove" title="Remove" href="#">';
                        filters += '<i class="glyphicon glyphicon-black glyphicon-remove"></i>';
                        filters += "</a>";
                    }
                }

                if (def.rel) {
                    if (j + 1 < def.values.length) {
                        filters += '<span class="' + relClass + '">' + def.rel + '</span>';
                    }
                }
            }
            filters += "</span>";
        }

        if (filters === "" && this.ifNoFilters) {
            filters = this.ifNoFilters;
        }

        if (filters !== "") {
            var frag = '<div class="' + containerClass + '">{{FILTERS}}</div>';
            frag = frag.replace(/{{FILTERS}}/g, filters);
            sf.context.html(frag);

            // click handler for when a filter remove button is clicked
            var removeSelector = edges.util.jsClassSelector(ns, "remove", this);
            edges.on(removeSelector, "click", this, "removeFilter");
        } else {
            sf.context.html("");
        }
    };

    /////////////////////////////////////////////////////
    // event handlers

    removeFilter(element) {
        var el = this.component.jq(element);
        var field = el.attr("data-field");
        var ft = el.attr("data-filter");
        var bool = el.attr("data-bool");

        var value = false;
        if (ft === "terms" || ft === "term") {
            value = el.attr("data-value");
        } else if (ft === "range") {
            value = {};

            var from = el.attr("data-gte");
            var fromType = "gte";
            if (!from) {
                from = el.attr("data-gt");
                fromType = "gt";
            }

            var to = el.attr("data-lt");
            var toType = "lt";
            if (!to) {
                to = el.attr("data-lte");
                toType = "lte";
            }

            if (from) {
                value["from"] = parseInt(from);
                value["fromType"] = fromType;
            }
            if (to) {
                value["to"] = parseInt(to);
                value["toType"] = toType;
            }
        }

        this.component.removeFilter(bool, ft, field, value);
    }
}