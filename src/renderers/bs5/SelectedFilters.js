// requires: $
// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs5")) { edges.renderers.bs5 = {}}

edges.renderers.bs5.SelectedFilters = class extends edges.Renderer {
    constructor(params) {
        super(params);

        this.showFilterField = edges.util.getParam(params, "showFilterField", true);

        this.allowRemove = edges.util.getParam(params, "allowRemove", true);

        this.showSearchString = edges.util.getParam(params, "showSearchString", false);

        this.ifNoFilters = edges.util.getParam(params, "ifNoFilters", false);

        this.hideValues = edges.util.getParam(params, "hideValues", []);

        this.omit = edges.util.getParam(params, "omit", []);

        this.namespace = "edges-bs5-selected-filters";
    }

    draw() {
        // for convenient short references
        var sf = this.component;
        var ns = this.namespace;

        // sort out the classes we are going to use
        var fieldClass = edges.util.styleClasses(ns, "field", this);
        var fieldNameClass = edges.util.styleClasses(ns, "fieldname", this);
        var valClass = edges.util.styleClasses(ns, "value", this);
        var clearAllClass = edges.util.styleClasses(ns, "clear-all", this);
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
                filters += '<span class="' + fieldNameClass + '">' + field + ':&nbsp;</span>';
            }
            filters += '<span class="' + valClass + '">"' + text + '"</span>';
            filters += '</span>';
        }

        var fields = Object.keys(sf.mustFilters);
        var showClear = false;
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            var def = sf.mustFilters[field];

            // render any compound filters
            if (def.filter === "compound") {
                filters += '<li class="tag ' + valClass + '">';
                filters += '<a href="DELETE" class="' + removeClass + '" data-compound="' + field + '" alt="Remove" title="Remove">';
                filters += def.display;
                filters += ' <span data-feather="x" aria-hidden="true"></span>';
                filters += "</a>";
                filters += "</li>";
                showClear = true;
            } else {
                if ($.inArray(field, this.omit) > -1) {
                    continue;
                }
                showClear = true;
            }

            for (var j = 0; j < def.values.length; j++) {
                filters += '<span class="' + fieldClass + '">';
                if (this.showFilterField) {
                    filters += '<span class="' + fieldNameClass + '">' + def.display + ':&nbsp;</span>';
                }
                var val = def.values[j];
                var valDisplay = ": " + val.display;
                if ($.inArray(field, this.hideValues) > -1) {
                    valDisplay = "";
                }
                filters += '<span class="' + valClass + '">' + val.display + '</span>';

                // the remove block looks different, depending on the kind of filter to remove
                if (this.allowRemove) {
                    var removeClass = edges.util.allClasses(ns, "remove", this);
                    if (def.filter === "term" || def.filter === "terms") {
                        filters += '<a class="' + removeClass + ' material-symbols-outlined" data-bool="must" data-filter="' + def.filter + '" data-field="' + field + '" data-value="' + val.val + '" alt="Remove" title="Remove" href="#">';
                        filters += "close";
                        filters += "</a>";
                    } else if (def.filter === "range") {
                        var from = val.from ? ' data-' + val.fromType + '="' + val.from + '" ' : "";
                        var to = val.to ? ' data-' + val.toType + '="' + val.to + '" ' : "";
                        filters += '<a class="' + removeClass + '" data-bool="must" data-filter="' + def.filter + '" data-field="' + field + '" ' + from + to + ' alt="Remove" title="Remove" href="#">';
                        filters += '<span class="material-symbols-outlined">close</span>';
                        filters += "</a>";
                    }
                }

                filters += "</span>";
            }
        }

        if (showClear) {
            var clearClass = edges.util.allClasses(this.namespace, "clear", this);
            var clearFrag = '<a href="#" class="' + clearClass + '" title="Clear all search and sort parameters and start again"> \
                    Clear all \
                </a>';

            filters += '<span class="' + clearAllClass + '">' + clearFrag + '</span>';
        }

        if (filters === "" && this.ifNoFilters) {
            filters = this.ifNoFilters;
        }

        if (filters !== "") {
            var frag = '<div class="' + containerClass + '">{{FILTERS}}</div>';
            frag = frag.replace(/{{FILTERS}}/g, filters);
            sf.context.parent().show();
            sf.context.html(frag);

            // click handler for when a filter remove button is clicked
            var removeSelector = edges.util.jsClassSelector(ns, "remove", this);
            edges.on(removeSelector, "click", this, "removeFilter");

            // click handler for when the clear button is clicked
            var clearSelector = edges.util.jsClassSelector(ns, "clear", this);
            edges.on(clearSelector, "click", this, "clearFilters");
        } else {
            sf.context.parent().hide();
        }
    }

    /////////////////////////////////////////////////////
    // event handlers

    removeFilter(element) {
        var el = this.component.jq(element);

        // if this is a compound filter, remove it by id
        var compound = el.attr("data-compound");
        if (compound) {
            this.component.removeCompoundFilter({compound_id: compound});
            return;
        }

        // otherwise follow the usual instructions for removing a filter
        var field = el.attr("data-field");
        var ft = el.attr("data-filter");
        var bool = el.attr("data-bool");

        var value = false;
        if (ft === "terms" || ft === "term") {
            var val = el.attr("data-value");
             // translate string value to a type required by a model
            if (val === "true"){
                value = true;
            }
            else if (val === "false"){
                value = false;
            }
            else if (!isNaN(parseInt(val))){
                value = parseInt(val);
            }
            else {
                value = val;
            }
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

    clearFilters() {
        this.component.clearSearch();
    }
}