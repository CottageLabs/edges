$.extend(true, edges, {
    bs4 : {
        newSearchBoxRenderer: function (params) {
            return edges.instantiate(edges.bs4.SearchBoxRenderer, params, edges.newRenderer);
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
            this.freetextSubmitDelay = edges.getParam(params.freetextSubmitDelay, 500);

            ////////////////////////////////////////

            this.namespace = "edges-bs4-search-box";

            this.draw = function () {
                var comp = this.component;

                // more classes that we'll use
                var resetClass = edges.css_classes(this.namespace, "reset", this);
                var textClass = edges.css_classes(this.namespace, "text", this);
                var searchClass = edges.css_classes(this.namespace, "search", this);

                // text search box id
                var textId = edges.css_id(this.namespace, "text", this);

                var clearFrag = "";
                if (this.clearButton) {
                    clearFrag = '<div class="input-group-prepend"><button type="button" class="btn btn-danger btn-sm ' + resetClass + '" title="Clear all search parameters and start again"> \
                            <span class="fas fa-times"></span> \
                        </button></div>';
                }

                var searchFrag = "";
                if (this.searchButton) {
                    var text = '<span class="fas fa-search"></span>';
                    if (this.searchButtonText !== false) {
                        text = this.searchButtonText;
                    }
                    searchFrag = '<div class="input-group-append"><button type="button" class="btn btn-info btn-sm ' + searchClass + '"> \
                            ' + text + ' \
                        </button></div>';
                }

                var searchBox = '<div class="form-inline"> \
                        <div class="input-group"> \
                            ' + clearFrag + '\
                            <input type="text" id="' + textId + '" class="' + textClass + ' form-control form-control-sm" name="q" value="" placeholder="' + this.searchPlaceholder + '"/> \
                            ' + searchFrag + '\
                        </div> \
                    </div>';

                var frag = '<div class="row"><div class="col">' + searchBox + '</div></div>';
                comp.context.html(frag);

                this.setUISearchText();

                // attach all the bindings
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
