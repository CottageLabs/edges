$.extend(true, edges, {
    bs3 : {
        newSearchBoxRenderer: function (params) {
            if (!params) {params = {}}
            edges.bs3.SearchBoxRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.SearchBoxRenderer(params);
        },
        SearchBoxRenderer: function (params) {
            // enable the search button
            this.searchButton = edges.getParam(params.searchButton, false);

            // text to include on the search button.  If not provided, will just be the magnifying glass
            this.searchButtonText = edges.getParam(params.searchButtonText, false);

            // should the clear button be rendered
            this.clearButton = edges.getParam(params.clearButton, true);

            // set the placeholder text for the search box
            this.searchPlaceholder = edges.getParam(params.searchPlaceholder, "Search");

            // amount of time between finishing typing and when a query is executed from the search box
            // set to -1 to disable freetext submit
            this.freetextSubmitDelay = edges.getParam(params.freetextSubmitDelay, 500);

            ////////////////////////////////////////
            // state variables

            this.namespace = "edges-bs3-search-box";

            this.draw = function () {
                var comp = this.component;

                // classes that we'll use
                var searchClasses = edges.css_classes(this.namespace, "search", this);
                var searchFieldClass = edges.css_classes(this.namespace, "field", this);
                var resetClass = edges.css_classes(this.namespace, "reset", this);
                var textClass = edges.css_classes(this.namespace, "text", this);
                var searchButtonClass = edges.css_classes(this.namespace, "search-button", this);

                // text search box id
                var textId = edges.css_id(this.namespace, "text", this);

                // select box for fields to search on
                var field_select = "";
                if (comp.fieldOptions && comp.fieldOptions.length > 0) {
                    field_select += '<select class="form-control ' + searchFieldClass + '" style="width: 120px">';
                    field_select += '<option value="">search all</option>';

                    for (var i = 0; i < comp.fieldOptions.length; i++) {
                        var obj = comp.fieldOptions[i];
                        field_select += '<option value="' + obj['field'] + '">' + edges.escapeHtml(obj['display']) + '</option>';
                    }
                    field_select += '</select>';
                }

                var clearFrag = "";
                if (this.clearButton) {
                    clearFrag = '<span class="input-group-btn"> \
                        <button type="button" class="btn btn-danger ' + resetClass + '" title="Clear all search parameters and start again"> \
                            <span class="glyphicon glyphicon-remove"></span> \
                        </button> \
                    </span>';
                }

                var searchFrag = "";
                if (this.searchButton) {
                    var text = '<span class="glyphicon glyphicon-white glyphicon-search"></span>';
                    if (this.searchButtonText !== false) {
                        text = this.searchButtonText;
                    }
                    searchFrag = '<span class="input-group-btn"> \
                        <button type="button" class="btn btn-info ' + searchButtonClass + '"> \
                            ' + text + ' \
                        </button> \
                    </span>';
                }

                var searchBox = '<div class="' + searchClasses + '"><div class="form-inline"> \
                        <div class="form-group"> \
                            <div class="input-group"> \
                                ' + clearFrag + field_select + '\
                                <input type="text" id="' + textId + '" class="form-control ' + textClass + '" name="q" value="" placeholder="' + this.searchPlaceholder + '"/> \
                                ' + searchFrag + ' \
                            </div> \
                        </div> \
                    </div></div>';

                // assemble the final fragment and render it into the component's context
                var frag = '<div class="row"><div class="col-md-12">{{SEARCH}}</div></div>';
                frag = frag.replace(/{{SEARCH}}/g, searchBox);

                comp.context.html(frag);

                if (comp.fieldOptions && comp.fieldOptions.length > 0) {
                    this.setUISearchField();
                }
                this.setUISearchText();

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

                if (this.clearButton) {
                    var resetSelector = edges.css_class_selector(this.namespace, "reset", this);
                    edges.on(resetSelector, "click", this, "clearSearch");
                }

                if (this.searchButton) {
                    var searchSelector = edges.css_class_selector(this.namespace, "search-button", this);
                    edges.on(searchSelector, "click", this, "doSearch");
                }
            };

            //////////////////////////////////////////////////////
            // functions for setting UI values

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
