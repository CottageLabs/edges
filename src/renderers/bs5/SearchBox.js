// requires: $
// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs5")) { edges.renderers.bs5 = {}}

edges.renderers.bs5.SearchBox = class extends edges.Renderer {
    constructor(params) {
        super(params);

        // enable the search button
        this.searchButton = edges.util.getParam(params, "searchButton", false);

        // text to include on the search button.  If not provided, will just be the magnifying glass
        this.searchButtonText = edges.util.getParam(params, "searchButtonText", false);

        // should the clear button be rendered
        this.clearButton = edges.util.getParam(params, "clearButton", true);

        // set the placeholder text for the search box
        this.searchPlaceholder = edges.util.getParam(params, "searchPlaceholder", "Search");

        // amount of time between finishing typing and when a query is executed from the search box
        // set to -1 to disable freetext submit
        this.freetextSubmitDelay = edges.util.getParam(params, "freetextSubmitDelay", 500);

        ////////////////////////////////////////
        // state variables

        this.namespace = "edges-bs5-search-box";
    }
    
    draw() {
        var comp = this.component;

        // classes that we'll use
        var searchClasses = edges.util.allClasses(this.namespace, "search", this);
        var searchFieldClass = edges.util.allClasses(this.namespace, "field", this);
        var resetClass = edges.util.allClasses(this.namespace, "reset", this);
        var textClass = edges.util.allClasses(this.namespace, "text", this);
        var searchButtonClass = edges.util.allClasses(this.namespace, "search-button", this);

        // text search box id
        var textId = edges.util.htmlID(this.namespace, "text", this);

        // select box for fields to search on
        var field_select = "";
        if (comp.fieldOptions && comp.fieldOptions.length > 0) {
            field_select += '<select class="form-control ' + searchFieldClass + '" style="width: 120px">';
            field_select += '<option value="">search all</option>';

            for (var i = 0; i < comp.fieldOptions.length; i++) {
                var obj = comp.fieldOptions[i];
                field_select += '<option value="' + obj['field'] + '">' + edges.util.escapeHtml(obj['display']) + '</option>';
            }
            field_select += '</select>';
        }

        var clearFrag = "";
        if (this.clearButton) {
            clearFrag = '<span class="input-group-btn"> \
                    <button type="button" class="btn btn-danger ' + resetClass + '" title="Clear all search parameters and start again"> \
                        <span class="material-symbols-outlined"></span> \
                    </button> \
                </span>';
        }

        var searchFrag = "";
        if (this.searchButton) {
            var text = '<span class="glyphicon glyphicon-white glyphicon-search"></span>';
            if (this.searchButtonText !== false) {
                text = this.searchButtonText;
            }
            searchFrag = '<button type="button" class="btn btn-primary ' + searchButtonClass + '"> \
                        ' + text + ' \
                    </button>';
        }

        var searchBox = '<div class="' + searchClasses + '">\
                            ' + clearFrag + field_select + '\
                            <input type="text" id="' + textId + '" class="form-control ' + textClass + '" name="q" value="" placeholder="' + this.searchPlaceholder + '"/> \
                            ' + searchFrag + ' \
                </div>';

        // assemble the final fragment and render it into the component's context
        var frag = '<div class="row"><div class="col-md-12">{{SEARCH}}</div></div>';
        frag = frag.replace(/{{SEARCH}}/g, searchBox);

        comp.context.html(frag);

        if (comp.fieldOptions && comp.fieldOptions.length > 0) {
            this.setUISearchField();
        }
        this.setUISearchText();

        if (comp.fieldOptions && comp.fieldOptions.length > 0) {
            var fieldSelector = edges.util.jsClassSelector(this.namespace, "field", this);
            edges.on(fieldSelector, "change", this, "changeSearchField");
        }
        var textSelector = edges.util.jsClassSelector(this.namespace, "text", this);
        if (this.freetextSubmitDelay > -1) {
            edges.on(textSelector, "keyup", this, "setSearchText", this.freetextSubmitDelay);
        } else {
            function onlyEnter(event) {
                var code = (event.keyCode ? event.keyCode : event.which);
                return code === 13;
            }

            edges.on(textSelector, "keyup", this, "setSearchText", false, onlyEnter);
        }

        let input = $(textSelector)[0]
        let end = input.value.length;
        window.setTimeout(() => {
            input.setSelectionRange(end, end);
            input.focus()
        }, 0);

        if (this.clearButton) {
            var resetSelector = edges.util.jsClassSelector(this.namespace, "reset", this);
            edges.on(resetSelector, "click", this, "clearSearch");
        }

        if (this.searchButton) {
            var searchSelector = edges.util.jsClassSelector(this.namespace, "search-button", this);
            edges.on(searchSelector, "click", this, "doSearch");
        }
    };

    //////////////////////////////////////////////////////
    // functions for setting UI values

    setUISearchField() {
        if (!this.component.searchField) {
            return;
        }
        // get the selector we need
        var fieldSelector = edges.util.jsClassSelector(this.namespace, "field", this);
        var el = this.component.jq(fieldSelector);
        el.val(this.component.searchField);
    }

    setUISearchText() {
        if (!this.component.searchString) {
            return;
        }
        // get the selector we need
        var textSelector = edges.util.jsClassSelector(this.namespace, "text", this);
        var el = this.component.jq(textSelector);
        el.val(this.component.searchString);
    }

    ////////////////////////////////////////
    // event handlers

    changeSearchField(element) {
        var val = this.component.jq(element).val();
        this.component.setSearchField(val);
    }

    setSearchText(element) {
        var val = this.component.jq(element).val();
        this.component.setSearchText(val);
    }

    clearSearch(element) {
        this.component.clearSearch();
    }

    doSearch(element) {
        var textId = edges.util.idSelector(this.namespace, "text", this);
        var text = this.component.jq(textId).val();
        this.component.setSearchText(text);
    }
}