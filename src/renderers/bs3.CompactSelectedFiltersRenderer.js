$.extend(true, edges, {
    bs3 : {
        newCompactSelectedFiltersRenderer: function (params) {
            if (!params) { params = {} }
            edges.bs3.CompactSelectedFiltersRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.CompactSelectedFiltersRenderer(params);
        },
        CompactSelectedFiltersRenderer: function (params) {

            this.showFilterField = edges.getParam(params.showFilterField, true);

            this.header = edges.getParam(params.header, "Active Filters");

            this.togglable = edges.getParam(params.togglable, true);

            this.open = edges.getParam(params.open, false);

            this.openIcon = edges.getParam(params.openIcon, "glyphicon glyphicon-plus");

            this.closeIcon = edges.getParam(params.closeIcon, "glyphicon glyphicon-minus");

            this.layout = edges.getParam(params.layout, "left");

            this.namespace = "edges-bs3-compact-selected-filters";

            this.draw = function () {
                // for convenient short references
                var sf = this.component;
                var ns = this.namespace;

                // sort out the classes we are going to use
                var facetClass = edges.css_classes(ns, "facet", this);
                var headerClass = edges.css_classes(ns, "header", this);
                var fieldClass = edges.css_classes(ns, "field", this);
                var fieldNameClass = edges.css_classes(ns, "fieldname", this);
                var valClass = edges.css_classes(ns, "value", this);
                var removeClass = edges.css_classes(ns, "remove", this);
                var relClass = edges.css_classes(ns, "rel", this);
                var filtersClass = edges.css_classes(ns, "filters", this);

                var toggleId = edges.css_id(ns, "toggle", this);
                var bodyId = edges.css_id(ns, "body", this);

                var filters = "";

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
                        if (def.filter == "term" || def.filter === "terms") {
                            filters += '<a class="' + removeClass + '" data-bool="must" data-filter="' + def.filter + '" data-field="' + field + '" data-value="' + val.val + '" alt="Remove" title="Remove" href="#">';
                            filters += '<i class="glyphicon glyphicon-black glyphicon-remove"></i>';
                            filters += "</a>";
                        } else if (def.filter === "range") {
                            var from = val.from ? ' data-from="' + val.from + '" ' : "";
                            var to = val.to ? ' data-to="' + val.to + '" ' : "";
                            filters += '<a class="' + removeClass + '" data-bool="must" data-filter="' + def.filter + '" data-field="' + field + '" ' + from + to + ' alt="Remove" title="Remove" href="#">';
                            filters += '<i class="glyphicon glyphicon-black glyphicon-remove"></i>';
                            filters += "</a>";
                        }

                        if (def.rel) {
                            if (j + 1 < def.values.length) {
                                filters += '<span class="' + relClass + '">' + def.rel + '</span>';
                            }
                        }
                    }
                    filters += "</span>";
                }

                var header = this.headerLayout({toggleId: toggleId});

                if (filters === "") {
                    filters = "No filters set";
                }
                var filterFrag = '<div class="' + filtersClass + '">{{FILTERS}}</div>';
                filterFrag = filterFrag.replace(/{{FILTERS}}/g, filters);

                // render the overall facet
                var frag = '<div class="' + facetClass + '">\
                    <div class="' + headerClass + '"><div class="row"> \
                        <div class="col-md-12">\
                            ' + header + '\
                        </div>\
                    </div></div>\
                    <div class="row" style="display:none" id="' + bodyId + '">\
                        <div class="col-md-12">\
                        ' + filterFrag + '\
                        </div>\
                    </div>\
                </div>';

                sf.context.html(frag);

                this.setUIOpen();

                // click handler for when a filter remove button is clicked
                var removeSelector = edges.css_class_selector(ns, "remove", this);
                edges.on(removeSelector, "click", this, "removeFilter");

                // for when the open button is clicked
                var toggleSelector = edges.css_id_selector(ns, "toggle", this);
                edges.on(toggleSelector, "click", this, "toggleOpen");
            };

            this.headerLayout = function(params) {
                var toggleId = params.toggleId;
                var iconClass = edges.css_classes(this.namespace, "icon", this);

                if (this.layout === "left") {
                    var tog = this.header;
                    if (this.togglable) {
                        tog = '<a href="#" id="' + toggleId + '"><i class="' + this.openIcon + '"></i>&nbsp;' + tog + "</a>";
                    }
                    return tog;
                } else if (this.layout === "right") {
                    var tog = "";
                    if (this.togglable) {
                        tog = '<a href="#" id="' + toggleId + '">' + this.header + '&nbsp;<i class="' + this.openIcon + ' ' + iconClass + '"></i></a>';
                    } else {
                        tog = this.header;
                    }

                    return tog;
                }
            };

            /////////////////////////////////////////////////////
            // UI behaviour functions

            this.setUIOpen = function () {
                // the selectors that we're going to use
                var bodySelector = edges.css_id_selector(this.namespace, "body", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                var body = this.component.jq(bodySelector);
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
                    body.show();
                } else {
                    var i = toggle.find("i");
                    for (var j = 0; j < closeBits.length; j++) {
                        i.removeClass(closeBits[j]);
                    }
                    for (var j = 0; j < openBits.length; j++) {
                        i.addClass(openBits[j]);
                    }
                    body.hide();
                }
            };

            /////////////////////////////////////////////////////
            // event handlers

            this.removeFilter = function (element) {
                var el = this.component.jq(element);
                var field = el.attr("data-field");
                var ft = el.attr("data-filter");
                var bool = el.attr("data-bool");

                var value = false;
                if (ft === "terms" || ft === "term") {
                    value = el.attr("data-value");
                } else if (ft === "range") {
                    value = {};
                    var from = el.attr("data-from");
                    var to = el.attr("data-to");
                    if (from) {
                        value["from"] = parseInt(from);
                    }
                    if (to) {
                        value["to"] = parseInt(to);
                    }
                }

                this.component.removeFilter(bool, ft, field, value);
            };

            this.toggleOpen = function (element) {
                this.open = !this.open;
                this.setUIOpen();
            };
        }
    }
});
