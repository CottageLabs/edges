// requires: edges
// requires: edges.util
// requires: es

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("components")) { edges.components = {}}

edges.components.FullSearchController = class extends edges.Component {
    constructor(params) {
        super(params);

        // if set, should be either * or ~
        // if *, * will be prepended and appended to each string in the freetext search term
        // if ~, ~ then ~ will be appended to each string in the freetext search term.
        // If * or ~ or : are already in the freetext search term, no action will be taken.
        this.fuzzify = edges.util.getParam(params, "fuzzify", false)

        // list of options by which the search results can be sorted
        // of the form of a list, thus: [{ field: '<field to sort by>', dir: "<sort dir>", display: '<display name>'}],
        this.sortOptions = edges.util.getParam(params, "sortOptions", false);

        // list of options for fields to which free text search can be constrained
        // of the form of a list thus: [{ field: '<field to search on>', display: '<display name>'}],
        this.fieldOptions = edges.util.getParam(params, "fieldOptions", false);

        // provide a function which will do url shortening for the share/save link
        this.urlShortener = edges.util.getParam(params, "urlShortener", false);

        // function to generate an embed snippet
        this.embedSnippet = edges.util.getParam(params, "embedSnippet", false);

        // on free-text search, default operator for the elasticsearch query system to use
        this.defaultOperator = edges.util.getParam(params, "defaultOperator", "OR");

        // if there is no other default field set, which field to focus the search on
        this.defaultField = edges.util.getParam(params, "defaultField", false);

        ///////////////////////////////////////////////
        // properties for tracking internal state

        // field on which to focus the freetext search (initially)
        this.searchField = false;

        // freetext search string
        this.searchString = false;

        this.sortBy = false;

        this.sortDir = "desc";

        // the short url for the current search, if it has been generated
        this.shortUrl = false;
    }

    synchronise() {
        // reset the state of the internal variables
        this.searchString = false;
        this.searchField = false;
        this.sortBy = false;
        this.sortDir = "desc";
        this.shortUrl = false;

        if (this.edge.currentQuery) {
            var qs = this.edge.currentQuery.getQueryString();
            if (qs) {
                this.searchString = qs.queryString;
                this.searchField = qs.defaultField;
            }
            var sorts = this.edge.currentQuery.getSortBy();
            if (sorts.length > 0) {
                this.sortBy = sorts[0].field;
                this.sortDir = sorts[0].order;
            }
        }
    }

    setSort(params) {
        var dir = params.dir;
        var field = params.field;

        if (dir === undefined || dir === false) {
            dir = "desc";
        }

        var nq = this.edge.cloneQuery();

        // replace the existing sort criteria
        nq.setSortBy(new es.Sort({
            field: field,
            order: dir
        }));

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    changeSortDir() {
        var dir = this.sortDir === "asc" ? "desc" : "asc";
        var sort = this.sortBy ? this.sortBy : "_score";
        var nq = this.edge.cloneQuery();

        // replace the existing sort criteria
        nq.setSortBy(new es.Sort({
            field: sort,
            order: dir
        }));

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    setSortBy(field) {
        var nq = this.edge.cloneQuery();

        // replace the existing sort criteria
        if (!field || field === "") {
            field = "_score";
        }
        nq.setSortBy(new es.Sort({
            field: field,
            order: this.sortDir
        }));

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    setSearchField(field, cycle) {
        if (cycle === undefined) {
            cycle = true;
        }

        // track the search field, as this may not trigger a search
        this.searchField = field;
        if (!this.searchString || this.searchString === "") {
            return;
        }

        var nq = this.edge.cloneQuery();

        // set the query with the new search field
        nq.setQueryString(new es.QueryString({
            queryString: this.searchString,
            defaultField: field,
            defaultOperator: this.defaultOperator,
            fuzzify: this.fuzzify
        }));

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        if (cycle) {
            this.edge.cycle();
        } else {
            this.searchField = field;
        }
    }

    setSearchText(text, cycle) {
        if (cycle === undefined) {
            cycle = true;
        }

        var nq = this.edge.cloneQuery();

        if (text !== "") {
            var params = {
                queryString: text,
                defaultOperator: this.defaultOperator,
                fuzzify: this.fuzzify
            };
            if (this.searchField && this.searchField !== "") {
                params["defaultField"] = this.searchField;
            } else if (this.defaultField) {
                params["defaultField"] = this.defaultField;
            }
            // set the query with the new search field
            nq.setQueryString(new es.QueryString(params));
        } else {
            nq.removeQueryString();
        }

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        if (cycle) {
            this.edge.cycle();
        } else {
            this.searchString = text;
        }
    }

    clearSearch() {
        this.edge.reset();
    }

    generateShortUrl(callback) {
        var query = this.edge.currentQuery.objectify({
            include_query_string : true,
            include_filters : true,
            include_paging : true,
            include_sort : true,
            include_fields : false,
            include_aggregations : false
        });
        var success_callback = edges.objClosure(this, "setShortUrl", false, callback);
        var error_callback = function() {};
        this.urlShortener(query, success_callback, error_callback);
    }

    setShortUrl(short_url, callback) {
        if (short_url) {
            this.shortUrl = short_url;
        } else {
            this.shortUrl = false;
        }
        callback();
    }
}