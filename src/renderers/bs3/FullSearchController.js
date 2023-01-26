// requires: $
// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs3")) { edges.renderers.bs3 = {}}

edges.renderers.bs3.FullSearchController = class extends edges.Renderer {
    constructor (params) {
        super(params)
        
        // enable the search button
        this.searchButton = edges.util.getParam(params, "searchButton", false);

        // text to include on the search button.  If not provided, will just be the magnifying glass
        this.searchButtonText = edges.util.getParam(params, "searchButtonText", false);

        // should the clear button be rendered
        this.clearButton = edges.util.getParam(params, "clearButton", true);

        // set the placeholder text for the search box
        this.searchPlaceholder = edges.util.getParam(params, "searchPlaceholder", "Search");

        // amount of time between finishing typing and when a query is executed from the search box
        this.freetextSubmitDelay = edges.util.getParam(params, "freetextSubmitDelay", 500);

        // enable the share/save link feature
        this.shareLink = edges.util.getParam(params, "shareLink", false);
        this.shareLinkText = edges.util.getParam(params, "shareLinkText", "share");

        ////////////////////////////////////////
        // state variables

        this.shareBoxOpen = false;

        this.showShortened = false;

        this.namespace = "edges-bs3-search-controller";
    }
    
    draw() {
        // reset these on each draw
        this.shareBoxOpen = false;
        this.showShortened = false;

        var comp = this.component;

        var shareButtonFrag = "";
        var shareFrag = "";
        if (this.shareLink) {
            var shareButtonClass = edges.util.allClasses(this.namespace, "toggle-share", this);
            shareButtonFrag = '<button class="' + shareButtonClass + ' btn btn-default btn-sm">' + this.shareLinkText + '</button>';
            var shorten = "";
            if (this.component.urlShortener) {
                var shortenClass = edges.util.allClasses(this.namespace, "shorten", this);
                shorten = '<div class="' + shortenClass + '">Share a link to this search <button class="btn btn-default btn-xs"><span class="glyphicon glyphicon-resize-small"></span>shorten url</button></div>'
            }
            var embed = "";
            if (this.component.embedSnippet) {
                var embedClass = edges.util.allClasses(this.namespace, "embed", this);
                embed = '<div class="row">\
                <div class="col-md-12">\
                    Embed this search in your webpage\
                </div>\
            </div>\
            <div class="row">\
                <div class="col-md-12">\
                    <textarea readonly class="' + embedClass + '"></textarea>\
                </div>\
            </div>';
            }
            var shareBoxClass = edges.util.allClasses(this.namespace, "share", this);
            var closeClass = edges.util.allClasses(this.namespace, "close-share", this);
            var shareUrlClass = edges.util.allClasses(this.namespace, "share-url", this);
            shareFrag = '<div class="' + shareBoxClass + '" style="display:none">\
            <div class="row">\
                <div class="col-md-11">\
                    ' + shorten + '\
                </div>\
                <div class="col-md-1">\
                    <a href="#" class="' + closeClass + ' pull-right"><span class="glyphicon glyphicon-remove"></span></a>\
                </div>\
            </div>\
            <div class="row">\
                <div class="col-md-12">\
                    <textarea readonly class="' + shareUrlClass + '"></textarea>\
                </div>\
            </div>\
            ' + embed + '\
        </div>';
        }

        // if sort options are provided render the orderer and the order by
        var sortOptions = "";
        if (comp.sortOptions && comp.sortOptions.length > 0) {
            // classes that we'll use
            var directionClass = edges.util.allClasses(this.namespace, "direction", this);
            var sortFieldClass = edges.util.allClasses(this.namespace, "sortby", this);

            sortOptions = '<div class="form-inline"> \
                <div class="form-group"> \
                    <div class="input-group"> \
                        <span class="input-group-btn"> \
                            <button type="button" class="btn btn-default btn-sm ' + directionClass + '" title="" href="#"></button> \
                        </span> \
                        <select class="' + sortFieldClass + ' form-control input-sm"> \
                            <option value="_score">Relevance</option>';

            for (var i = 0; i < comp.sortOptions.length; i++) {
                var field = comp.sortOptions[i].field;
                var display = comp.sortOptions[i].display;
                sortOptions += '<option value="' + field + '">' + edges.util.escapeHtml(display) + '</option>';
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
            var searchFieldClass = edges.util.allClasses(this.namespace, "field", this);

            field_select += '<select class="' + searchFieldClass + ' form-control input-sm">';
            field_select += '<option value="">search all</option>';

            for (var i = 0; i < comp.fieldOptions.length; i++) {
                var obj = comp.fieldOptions[i];
                field_select += '<option value="' + obj['field'] + '">' + edges.util.escapeHtml(obj['display']) + '</option>';
            }
            field_select += '</select>';
        }

        // more classes that we'll use
        var resetClass = edges.util.allClasses(this.namespace, "reset", this);
        var textClass = edges.util.allClasses(this.namespace, "text", this);
        var searchClass = edges.util.allClasses(this.namespace, "search", this);

        // text search box id
        var textId = edges.util.htmlID(this.namespace, "text", this);

        var clearFrag = "";
        if (this.clearButton) {
            clearFrag = '<span class="input-group-btn"> \
            <button type="button" class="btn btn-danger btn-sm ' + resetClass + '" title="Clear all search and sort parameters and start again"> \
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
            <button type="button" class="btn btn-info btn-sm ' + searchClass + '"> \
                ' + text + ' \
            </button> \
        </span>';
        }

        var searchBox = '<div class="form-inline"> \
            <div class="form-group"> \
                <div class="input-group"> \
                    ' + clearFrag + field_select + '\
                    <input type="text" id="' + textId + '" class="' + textClass + ' form-control input-sm" name="q" value="" placeholder="' + this.searchPlaceholder + '"/> \
                    ' + searchFrag + ' \
                </div> \
            </div> \
        </div>';

        // caclulate all the div widths
        var shareMd = "2";
        var sortMd = "4";
        var searchMd = this.shareLink ? "6" : sortOptions !== "" ? "8" : "12";
        var shareXs = "6";
        var sortXs = "6";
        var searchXs = "12";

        // assemble the final fragment and render it into the component's context
        var lhs = "";
        if (this.shareLink) {
            lhs = '<div class="col-xs-' + shareXs + ' col-md-' + shareMd + '">' + shareButtonFrag + '</div>'
        }
        if (sortOptions !== "") {
            lhs += '<div class="col-xs-' + sortXs + ' col-md-' + sortMd + '">' + sortOptions + '</div>';
        }

        let containerClass = edges.util.styleClasses(this.namespace, "container", this);
        var frag = '<div class="' + containerClass + '"><div class="row">' + lhs + '<div class="col-xs-' + searchXs + ' col-md-' + searchMd + '">{{SEARCH}}</div></div>' + shareFrag + "</div>";

        frag = frag.replace(/{{SEARCH}}/g, searchBox);

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
            var directionSelector = edges.util.jsClassSelector(this.namespace, "direction", this);
            var sortSelector = edges.util.jsClassSelector(this.namespace, "sortby", this);
            edges.on(directionSelector, "click", this, "changeSortDir");
            edges.on(sortSelector, "change", this, "changeSortBy");
        }
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

        var resetSelector = edges.util.jsClassSelector(this.namespace, "reset", this);
        edges.on(resetSelector, "click", this, "clearSearch");

        var searchSelector = edges.util.jsClassSelector(this.namespace, "search", this);
        edges.on(searchSelector, "click", this, "doSearch");

        if (this.shareLink) {
            var shareSelector = edges.util.jsClassSelector(this.namespace, "toggle-share", this);
            edges.on(shareSelector, "click", this, "toggleShare");

            var closeShareSelector = edges.util.jsClassSelector(this.namespace, "close-share", this);
            edges.on(closeShareSelector, "click", this, "toggleShare");

            if (this.component.urlShortener) {
                var shortenSelector = edges.util.jsClassSelector(this.namespace, "shorten", this);
                edges.on(shortenSelector, "click", this, "toggleShorten");
            }
        }
    }

    //////////////////////////////////////////////////////
    // functions for setting UI values

    setUISortDir() {
        // get the selector we need
        var directionSelector = edges.util.jsClassSelector(this.namespace, "direction", this);
        var el = this.component.jq(directionSelector);
        if (this.component.sortDir === 'asc') {
            el.html('sort <i class="glyphicon glyphicon-arrow-up"></i> by');
            el.attr('title', 'Current order ascending. Click to change to descending');
        } else {
            el.html('sort <i class="glyphicon glyphicon-arrow-down"></i> by');
            el.attr('title', 'Current order descending. Click to change to ascending');
        }
    }

    setUISortField() {
        if (!this.component.sortBy) {
            return;
        }
        // get the selector we need
        var sortSelector = edges.util.jsClassSelector(this.namespace, "sortby", this);
        var el = this.component.jq(sortSelector);
        el.val(this.component.sortBy);
    }

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

    changeSortDir = function (element) {
        this.component.changeSortDir();
    }

    changeSortBy = function (element) {
        var val = this.component.jq(element).val();
        this.component.setSortBy(val);
    }

    changeSearchField = function (element) {
        var val = this.component.jq(element).val();
        this.component.setSearchField(val);
    }

    setSearchText = function (element) {
        var val = this.component.jq(element).val();
        this.component.setSearchText(val);
    }

    clearSearch = function (element) {
        this.component.clearSearch();
    }

    doSearch = function (element) {
        var textId = edges.util.idSelector(this.namespace, "text", this);
        var text = this.component.jq(textId).val();
        this.component.setSearchText(text);
    }

    toggleShare = function(element) {
        var shareSelector = edges.util.jsClassSelector(this.namespace, "share", this);
        var shareUrlSelector = edges.util.jsClassSelector(this.namespace, "share-url", this);
        var el = this.component.jq(shareSelector);
        var textarea = this.component.jq(shareUrlSelector);
        if (this.shareBoxOpen) {
            el.hide();
            textarea.val("");
            if (this.component.embedSnippet) {
                var embedSelector = edges.util.jsClassSelector(this.namespace, "embed", this);
                var embedTextarea = this.component.jq(embedSelector);
                embedTextarea.val("");
            }
            this.shareBoxOpen = false;
        } else {
            el.show();
            if (this.showShortened) {
                textarea.val(this.component.shortUrl);
            } else {
                textarea.val(this.component.edge.fullUrl());
            }
            if (this.component.embedSnippet) {
                var embedSelector = edges.util.jsClassSelector(this.namespace, "embed", this);
                var embedTextarea = this.component.jq(embedSelector);
                embedTextarea.val(this.component.embedSnippet(this));
            }
            this.shareBoxOpen = true;
        }
    }

    toggleShorten(element) {
        if (!this.component.shortUrl) {
            var callback = edges.objClosure(this, "updateShortUrl");
            this.component.generateShortUrl(callback);
        } else {
            this.updateShortUrl();
        }
    }

    updateShortUrl() {
        var shareUrlSelector = edges.util.jsClassSelector(this.namespace, "share-url", this);
        var shortenSelector = edges.util.jsClassSelector(this.namespace, "shorten", this);
        var textarea = this.component.jq(shareUrlSelector);
        var button = this.component.jq(shortenSelector).find("button");
        if (this.showShortened) {
            textarea.val(this.component.edge.fullUrl());
            button.html('<span class="glyphicon glyphicon-resize-small"></span>shorten url');
            this.showShortened = false;
        } else {
            textarea.val(this.component.shortUrl);
            button.html('<span class="glyphicon glyphicon-resize-full"></span>original url');
            this.showShortened = true;
        }
    }
}