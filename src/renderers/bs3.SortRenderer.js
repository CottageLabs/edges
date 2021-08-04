$.extend(true, edges, {
    bs3 : {
        newSortRenderer: function (params) {
            if (!params) {params = {}}
            edges.bs3.SortRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.SortRenderer(params);
        },
        SortRenderer: function (params) {

            this.prefix = edges.getParam(params.prefix, "");

            // should the direction switcher be rendered?  If not, then it's wise to set "dir" on the components
            // sortOptions, so that the correct dir is used
            this.dirSwitcher = edges.getParam(params.dirSwitcher, true);

            this.namespace = "edges-bs3-search-controller";

            this.draw = function () {
                var comp = this.component;

                // if sort options are provided render the orderer and the order by
                var sortOptions = "";
                if (comp.sortOptions && comp.sortOptions.length > 0) {
                    // classes that we'll use
                    var directionClass = edges.css_classes(this.namespace, "direction", this);
                    var sortFieldClass = edges.css_classes(this.namespace, "sortby", this);
                    var prefixClass = edges.css_classes(this.namespace, "prefix", this);

                    var selectName = edges.css_id(this.namespace, "select", this);

                    var label = '<label class="' + prefixClass + '" for="' + selectName + '">' + this.prefix + '</label>';

                    var direction = "";
                    if (this.dirSwitcher) {
                        direction = '<span class="input-group-btn"> \
                            <button type="button" class="btn btn-default btn-sm ' + directionClass + '" title="" href="#"></button> \
                        </span>';
                    }

                    sortOptions = '<div class="form-inline"> \
                            <div class="form-group"> \
                                ' + label + '\
                                <div class="input-group"> \
                                    ' + direction + ' \
                                    <select name="' + selectName + '" class="form-control input-sm ' + sortFieldClass + '"> \
                                        <option value="_score">Relevance</option>';

                    for (var i = 0; i < comp.sortOptions.length; i++) {
                        var field = comp.sortOptions[i].field;
                        var display = comp.sortOptions[i].display;
                        var dir = comp.sortOptions[i].dir;
                        if (dir === undefined) {
                            dir = "";
                        }
                        dir = " " + dir;
                        sortOptions += '<option value="' + field + '' + dir + '">' + edges.escapeHtml(display) + '</option>';
                    }

                    sortOptions += ' </select> \
                                </div> \
                            </div> \
                        </div>';
                }

                // assemble the final fragment and render it into the component's context
                var frag = '<div class="row"><div class="col-md-12">{{SORT}}</div></div>';
                frag = frag.replace(/{{SORT}}/g, sortOptions);

                comp.context.html(frag);

                // now populate all the dynamic bits
                if (comp.sortOptions && comp.sortOptions.length > 0) {
                    if (this.dirSwitcher) {
                        this.setUISortDir();
                    }
                    this.setUISortField();
                }

                // attach all the bindings
                if (comp.sortOptions && comp.sortOptions.length > 0) {
                    var directionSelector = edges.css_class_selector(this.namespace, "direction", this);
                    var sortSelector = edges.css_class_selector(this.namespace, "sortby", this);
                    edges.on(directionSelector, "click", this, "changeSortDir");
                    edges.on(sortSelector, "change", this, "changeSortBy");
                }
            };

            //////////////////////////////////////////////////////
            // functions for setting UI values

            this.setUISortDir = function () {
                // get the selector we need
                var directionSelector = edges.css_class_selector(this.namespace, "direction", this);
                var el = this.component.jq(directionSelector);
                if (this.component.sortDir === 'asc') {
                    el.html('sort <i class="glyphicon glyphicon-arrow-up"></i> by');
                    el.attr('title', 'Current order ascending. Click to change to descending');
                } else {
                    el.html('sort <i class="glyphicon glyphicon-arrow-down"></i> by');
                    el.attr('title', 'Current order descending. Click to change to ascending');
                }
            };

            this.setUISortField = function () {
                if (!this.component.sortBy) {
                    return;
                }
                // get the selector we need
                var sortSelector = edges.css_class_selector(this.namespace, "sortby", this);
                var el = this.component.jq(sortSelector);

                // find out the available value options
                var options = el.find("option");
                var vals = [];
                for (var i = 0; i < options.length; i++) {
                    vals.push($(options[i]).attr("value"));
                }

                // sort out the value we want to set
                var fieldVal = this.component.sortBy;
                var fullVal = this.component.sortBy + " " + this.component.sortDir;

                // choose the first value which matches an actual option
                var setVal = false;
                if ($.inArray(fieldVal, vals) > -1) {
                    setVal = fieldVal;
                } else if ($.inArray(fullVal, vals) > -1) {
                    setVal = fullVal;
                }

                if (setVal !== false) {
                    el.val(setVal);
                }
            };

            ////////////////////////////////////////
            // event handlers

            this.changeSortDir = function (element) {
                this.component.changeSortDir();
            };

            this.changeSortBy = function (element) {
                var val = this.component.jq(element).val();
                var bits = val.split(" ");
                var field = bits[0];
                var dir = false;
                if (bits.length === 2) {
                    dir = bits[1];
                }
                this.component.setSort({field: field, dir: dir});
            };
        }
    }
});
