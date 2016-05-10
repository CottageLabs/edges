$.extend(true, edges, {
    bs3 : {
        newFullSearchControllerRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.FullSearchControllerRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.FullSearchControllerRenderer(params);
        },
        FullSearchControllerRenderer: function (params) {
            // enable the search button
            this.searchButton = params.searchButton || false;

            // amount of time between finishing typing and when a query is executed from the search box
            this.freetextSubmitDelay = edges.getParam(params.freetextSubmitDelay, 500);

            // after search, the results will fade in over this number of milliseconds
            this.fadeIn = params.fadeIn || 800;

            // enable the share/save link feature
            this.shareLink = params.shareLink || false;

            ////////////////////////////////////////
            // state variables

            this.showShortUrl = false;

            this.namespace = "edges-bs3-search-controller";

            this.draw = function () {
                var comp = this.component;

                // if sort options are provided render the orderer and the order by
                var sortOptions = "&nbsp;";
                if (comp.sortOptions && comp.sortOptions.length > 0) {
                    // classes that we'll use
                    var directionClass = edges.css_classes(this.namespace, "direction", this);
                    var sortFieldClass = edges.css_classes(this.namespace, "sortby", this);

                    sortOptions = '<div class="form-inline"> \
                            <div class="form-group"> \
                                <div class="input-group"> \
                                    <span class="input-group-btn"> \
                                        <button type="button" class="btn btn-default btn-sm ' + directionClass + '" title="" href="#"></button> \
                                    </span> \
                                    <select class="form-control input-sm ' + sortFieldClass + '"> \
                                        <option value="_score">Relevance</option>';

                    for (var i = 0; i < comp.sortOptions.length; i++) {
                        var field = comp.sortOptions[i].field;
                        var display = comp.sortOptions[i].display;
                        sortOptions += '<option value="' + field + '">' + edges.escapeHtml(display) + '</option>';
                    }

                    sortOptions += ' </select> \
                                </div> \
                            </div> \
                        </div>';
                }

                // select box for fields to search on
                var field_select = "";
                if (comp.fieldOptions && comp.fieldOptions.length > 0) {
                    // classes that we'll use
                    var searchFieldClass = edges.css_classes(this.namespace, "field", this);

                    field_select += '<select class="form-control input-sm ' + searchFieldClass + '" style="width: 120px">';
                    field_select += '<option value="">search all</option>';

                    for (var i = 0; i < comp.fieldOptions.length; i++) {
                        var obj = comp.fieldOptions[i];
                        field_select += '<option value="' + obj['field'] + '">' + edges.escapeHtml(obj['display']) + '</option>';
                    }
                    field_select += '</select>';
                }

                // more classes that we'll use
                var resetClass = edges.css_classes(this.namespace, "reset", this);
                var textClass = edges.css_classes(this.namespace, "text", this);
                var searchClass = edges.css_classes(this.namespace, "search", this);

                // text search box id
                var textId = edges.css_id(this.namespace, "text", this);

                var searchBox = '<div class="form-inline pull-right"> \
                        <div class="form-group"> \
                            <div class="input-group"> \
                                <span class="input-group-btn"> \
                                    <button type="button" class="btn btn-danger btn-sm ' + resetClass + '" title="Clear all search parameters and start again"> \
                                        <span class="glyphicon glyphicon-remove"></span> \
                                    </button> \
                                </span> ' + field_select + '\
                                <input type="text" id="' + textId + '" class="form-control input-sm ' + textClass + '" name="q" value="" placeholder="Search" style="width: 200px" /> \
                                <span class="input-group-btn"> \
                                    <button type="button" class="btn btn-info btn-sm ' + searchClass + '"> \
                                        <span class="glyphicon glyphicon-white glyphicon-search"></span> \
                                    </button> \
                                </span> \
                            </div> \
                        </div> \
                    </div>';

                // assemble the final fragment and render it into the component's context
                var frag = '<div class="row"><div class="col-md-5">{{SORT}}</div><div class="col-md-7">{{SEARCH}}</div></div>';
                frag = frag.replace(/{{SORT}}/g, sortOptions)
                    .replace(/{{SEARCH}}/g, searchBox);

                comp.context.html(frag);

                // now populate all the dynamic bits
                if (comp.sortOptions && comp.sortOptions.length > 0) {
                    this.setUISortDir();
                    this.setUISortField();
                }
                if (comp.fieldOptions && comp.fieldOptions.length > 0) {
                    this.setUISearchField();
                }
                this.setUISearchText();

                // attach all the bindings
                if (comp.sortOptions && comp.sortOptions.length > 0) {
                    var directionSelector = edges.css_class_selector(this.namespace, "direction", this);
                    var sortSelector = edges.css_class_selector(this.namespace, "sortby", this);
                    edges.on(directionSelector, "click", this, "changeSortDir");
                    edges.on(sortSelector, "change", this, "changeSortBy");
                }
                if (comp.fieldOptions && comp.fieldOptions.length > 0) {
                    var fieldSelector = edges.css_class_selector(this.namespace, "field", this);
                    edges.on(fieldSelector, "change", this, "changeSearchField");
                }
                var textSelector = edges.css_class_selector(this.namespace, "text", this);
                if (this.freetextSubmitDelay > -1) {
                    edges.on(textSelector, "keyup", this, "setSearchText", this.freetextSubmitDelay);
                } else {
                    function onlyEnter(event) {
                        var code = (event.keyCode ? event.keyCode : event.which);
                        return code === 13;
                    }

                    edges.on(textSelector, "keyup", this, "setSearchText", false, onlyEnter);
                }

                var resetSelector = edges.css_class_selector(this.namespace, "reset", this);
                edges.on(resetSelector, "click", this, "clearSearch");

                var searchSelector = edges.css_class_selector(this.namespace, "search", this);
                edges.on(searchSelector, "click", this, "doSearch");
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
                el.val(this.component.sortBy);
            };

            this.setUISearchField = function () {
                if (!this.component.searchField) {
                    return;
                }
                // get the selector we need
                var fieldSelector = edges.css_class_selector(this.namespace, "field", this);
                var el = this.component.jq(fieldSelector);
                el.val(this.component.searchField);
            };

            this.setUISearchText = function () {
                if (!this.component.searchString) {
                    return;
                }
                // get the selector we need
                var textSelector = edges.css_class_selector(this.namespace, "text", this);
                var el = this.component.jq(textSelector);
                el.val(this.component.searchString);
            };

            ////////////////////////////////////////
            // event handlers

            this.changeSortDir = function (element) {
                this.component.changeSortDir();
            };

            this.changeSortBy = function (element) {
                var val = this.component.jq(element).val();
                this.component.setSortBy(val);
            };

            this.changeSearchField = function (element) {
                var val = this.component.jq(element).val();
                this.component.setSearchField(val);
            };

            this.setSearchText = function (element) {
                var val = this.component.jq(element).val();
                this.component.setSearchText(val);
            };

            this.clearSearch = function (element) {
                this.component.clearSearch();
            };

            this.doSearch = function (element) {
                var textId = edges.css_id_selector(this.namespace, "text", this);
                var text = this.component.jq(textId).val();
                this.component.setSearchText(text);
            };
        }
    }
});
