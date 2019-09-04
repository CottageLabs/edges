$.extend(true, edges, {
    bs3 : {
        newFullSearchControllerRenderer: function (params) {
            if (!params) {params = {}}
            edges.bs3.FullSearchControllerRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.FullSearchControllerRenderer(params);
        },
        FullSearchControllerRenderer: function (params) {
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

            // enable the share/save link feature
            this.shareLink = edges.getParam(params.shareLink, false);
            this.shareLinkText = edges.getParam(params.shareLinkText, "share");

            ////////////////////////////////////////
            // state variables

            this.shareBoxOpen = false;

            this.showShortened = false;

            this.namespace = "edges-bs3-search-controller";

            this.draw = function () {
                // reset these on each draw
                this.shareBoxOpen = false;
                this.showShortened = false;

                var comp = this.component;

                var shareButtonFrag = "";
                var shareFrag = "";
                if (this.shareLink) {
                    var shareButtonClass = edges.css_classes(this.namespace, "toggle-share", this);
                    shareButtonFrag = '<button class="' + shareButtonClass + ' btn btn-default btn-sm">' + this.shareLinkText + '</button>';
                    var shorten = "";
                    if (this.component.urlShortener) {
                        var shortenClass = edges.css_classes(this.namespace, "shorten", this);
                        shorten = '<div class="' + shortenClass + '">Share a link to this search <button class="btn btn-default btn-xs"><span class="glyphicon glyphicon-resize-small"></span>shorten url</button></div>'
                    }
                    var embed = "";
                    if (this.component.embedSnippet) {
                        var embedClass = edges.css_classes(this.namespace, "embed", this);
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
                    var shareBoxClass = edges.css_classes(this.namespace, "share", this);
                    var closeClass = edges.css_classes(this.namespace, "close-share", this);
                    var shareUrlClass = edges.css_classes(this.namespace, "share-url", this);
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
                    var directionClass = edges.css_classes(this.namespace, "direction", this);
                    var sortFieldClass = edges.css_classes(this.namespace, "sortby", this);

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

                    field_select += '<select class="' + searchFieldClass + ' form-control input-sm">';
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

                var frag = '<div class="row">' + lhs + '<div class="col-xs-' + searchXs + ' col-md-' + searchMd + '">{{SEARCH}}</div></div>' + shareFrag;
                
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

                if (this.shareLink) {
                    var shareSelector = edges.css_class_selector(this.namespace, "toggle-share", this);
                    edges.on(shareSelector, "click", this, "toggleShare");

                    var closeShareSelector = edges.css_class_selector(this.namespace, "close-share", this);
                    edges.on(closeShareSelector, "click", this, "toggleShare");

                    if (this.component.urlShortener) {
                        var shortenSelector = edges.css_class_selector(this.namespace, "shorten", this);
                        edges.on(shortenSelector, "click", this, "toggleShorten");
                    }
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

            this.toggleShare = function(element) {
                var shareSelector = edges.css_class_selector(this.namespace, "share", this);
                var shareUrlSelector = edges.css_class_selector(this.namespace, "share-url", this);
                var el = this.component.jq(shareSelector);
                var textarea = this.component.jq(shareUrlSelector);
                if (this.shareBoxOpen) {
                    el.hide();
                    textarea.val("");
                    if (this.component.embedSnippet) {
                        var embedSelector = edges.css_class_selector(this.namespace, "embed", this);
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
                        var embedSelector = edges.css_class_selector(this.namespace, "embed", this);
                        var embedTextarea = this.component.jq(embedSelector);
                        embedTextarea.val(this.component.embedSnippet(this));
                    }
                    this.shareBoxOpen = true;
                }
            };

            this.toggleShorten = function(element) {
                if (!this.component.shortUrl) {
                    var callback = edges.objClosure(this, "updateShortUrl");
                    this.component.generateShortUrl(callback);
                } else {
                    this.updateShortUrl();
                }
            };

            this.updateShortUrl = function() {
                var shareUrlSelector = edges.css_class_selector(this.namespace, "share-url", this);
                var shortenSelector = edges.css_class_selector(this.namespace, "shorten", this);
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
            };
        }
    }
});
