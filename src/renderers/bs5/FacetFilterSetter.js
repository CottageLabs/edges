// requires: $
// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs5")) { edges.renderers.bs5 = {}}

edges.renderers.bs5.FacetFilterSetter = class extends edges.Renderer {
    constructor(params) {
        super(params);

        // whether the facet should be open or closed
        // can be initialised and is then used to track internal state
        this.open = edges.util.getParam(params, "open", false);

        // whether the facet can be opened and closed
        this.togglable = edges.util.getParam(params, "togglable", true);

        // whether the count should be displayed along with the term
        // defaults to false because count may be confusing to the user in an OR selector
        this.showCount = edges.util.getParam(params, "showCount", false);

        // The display title for the facet
        this.facetTitle = edges.util.getParam(params, "facetTitle", "Untitled");

        this.intro = edges.util.getParam(params, "intro", false);

        this.openIcon = edges.util.getParam(params, "openIcon", "glyphicon glyphicon-plus");

        this.closeIcon = edges.util.getParam(params, "closeIcon", "glyphicon glyphicon-minus");

        this.layout = edges.util.getParam(params, "layout", "left");

        // namespace to use in the page
        this.namespace = "edges-bs5-facet-filter-setter";
    }

    draw() {
        // for convenient short references ...
        var comp = this.component;
        var namespace = this.namespace;

        // sort out all the classes that we're going to be using
        var filterClass = edges.util.allClasses(namespace, "filter", this);
        var valClass = edges.util.allClasses(namespace, "value", this);
        var filterRemoveClass = edges.util.allClasses(namespace, "filter-remove", this);
        var facetClass = edges.util.allClasses(namespace, "facet", this);
        var headerClass = edges.util.allClasses(namespace, "header", this);
        var bodyClass = edges.util.allClasses(this.namespace, "body", this);
        var introClass = edges.util.allClasses(this.namespace, "intro", this);
        var countClass = edges.util.allClasses(namespace, "count", this);

        var toggleId = edges.util.htmlID(namespace, "toggle", this);
        var resultsId = edges.util.htmlID(namespace, "results", this);

        var filters = "";
        for (var i = 0; i < comp.filters.length; i++) {
            var filter = comp.filters[i];
            var id = filter.id;
            var display = filter.display;
            var count = comp.filter_counts[id];
            var active = comp.active_filters[id];

            if (count === undefined) {
                count = 0;
            }

            filters += '<div class="' + filterClass + '">';

            if (active) {
                filters += '<a href="#" class="' + filterRemoveClass + ' active" data-filter="' + edges.util.escapeHtml(id) + '">';
                if (filter.icon){
                    if (filter.icon.active){
                        filters += filter.icon.active;
                    }
                    else {
                        filters += filter.icon;
                    }
                }
                filters += display;
                if (this.showCount) {
                    filters += " (" + count + ")";
                }
                filters += '</a>';
            } else {
                filters += '<a href="#" class="' + valClass + ' inactive" data-filter="' + edges.util.escapeHtml(id) + '">'
                if (filter.icon){
                    if (filter.icon.inactive){
                        filters += filter.icon.inactive;
                    }
                    else {
                        filters += filter.icon;
                    }
                }
                filters += '<label class="form-label">' + display + '</label>';
                if (this.showCount) {
                    filters += ' <span class="' + countClass + '">(' + count + ')</span>';
                }
                filters += "</a>";
            }

            filters += "</div>";
        }

        var header = this.headerLayout({toggleId: toggleId});

        var introFrag = "";
        if (this.intro !== false) {
            introFrag = '<div class="' + introClass + '">' + this.intro + '</div>';
        }

        // render the overall facet
        var frag = '<div class="' + facetClass + '">\
                    <div class="' + headerClass + '"><div class="row"> \
                        <div class="col-md-12">\
                            ' + header + '\
                        </div>\
                    </div></div>\
                    <div class="' + bodyClass + '">\
                        <div class="row" style="display:none" id="' + resultsId + '">\
                            <div class="col-md-12">\
                                ' + introFrag + '\
                                {{FILTERS}}\
                            </div>\
                        </div></div>\
                    </div>';

        // substitute in the component parts
        frag = frag.replace(/{{FILTERS}}/g, filters);

        // now render it into the page
        comp.context.html(frag);

        // trigger all the post-render set-up functions
        this.setUIOpen();

        // sort out the selectors we're going to be needing
        var valueSelector = edges.util.jsClassSelector(namespace, "value", this);
        var filterRemoveSelector = edges.util.jsClassSelector(namespace, "filter-remove", this);
        var toggleSelector = edges.util.idSelector(namespace, "toggle", this);

        // for when a value in the facet is selected
        edges.on(valueSelector, "click", this, "filterSelected");
        // for when the open button is clicked
        edges.on(toggleSelector, "click", this, "toggleOpen");
        // for when a filter remove button is clicked
        edges.on(filterRemoveSelector, "click", this, "removeFilter");
    }

    headerLayout(params) {
        var toggleId = params.toggleId;
        var iconClass = edges.util.allClasses(this.namespace, "icon", this);

        if (this.layout === "left") {
            var tog = this.facetTitle;
            if (this.togglable) {
                tog = '<a href="#" id="' + toggleId + '"><i class="' + this.openIcon + '"></i>&nbsp;' + tog + "</a>";
            }
            return tog;
        } else if (this.layout === "right") {
            var tog = "";
            if (this.togglable) {
                tog = '<a href="#" id="' + toggleId + '">' + this.facetTitle + '&nbsp;<i class="' + this.openIcon + ' ' + iconClass + '"></i></a>';
            } else {
                tog = this.facetTitle;
            }
            return tog;
        }
    }

    setUIOpen() {
        // the selectors that we're going to use
        var resultsSelector = edges.util.idSelector(this.namespace, "results", this);
        var toggleSelector = edges.util.idSelector(this.namespace, "toggle", this);

        var results = this.component.jq(resultsSelector);
        var toggle = this.component.jq(toggleSelector);

        var openBits = this.openIcon.split(" ");
        var closeBits = this.closeIcon.split(" ");

        if (this.open) {
            var i = toggle.find("i");
            for (var j = 0; j < openBits.length; j++) {
                i.removeClass(openBits[j]);
            }
            for (var j = 0; j < closeBits.length; j++) {
                i.addClass(closeBits[j]);
            }
            results.show();
        } else {
            var i = toggle.find("i");
            for (var j = 0; j < closeBits.length; j++) {
                i.removeClass(closeBits[j]);
            }
            for (var j = 0; j < openBits.length; j++) {
                i.addClass(openBits[j]);
            }
            results.hide();
        }
    }

    filterSelected(element) {
        var filter_id = this.component.jq(element).attr("data-filter");
        this.component.addFilter(filter_id);
    }

    removeFilter(element) {
        var filter_id = this.component.jq(element).attr("data-filter");
        this.component.removeFilter(filter_id);
    }

    toggleOpen(element) {
        this.open = !this.open;
        this.setUIOpen();
    }
}