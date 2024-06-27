if (!window.hasOwnProperty("es")) { es = {}}

// request method to be used throughout.  Set this before using the module if you want it different
es.requestMethod = "get";

// add request headers (such as Auth) if you need to
es.requestHeaders = false;

// Base classes
es.Aggregation = class {
    static type = "aggregation";

    constructor(params) {
        this.name = params.name;
        this.aggs = params.aggs || [];
    }

    addAggregation(agg) {
        for (var i = 0; i < this.aggs.length; i++) {
            if (this.aggs[i].name === agg.name) {
                return;
            }
        }
        this.aggs.push(agg);
    }

    removeAggregation() {}
    clearAggregations() {}

    // for use by sub-classes, for their convenience in rendering
    // the overall structure of the aggregation to an object
    _make_aggregation(type, body) {
        var obj = {};
        obj[this.name] = {};
        obj[this.name][type] = body;

        if (this.aggs.length > 0) {
            obj[this.name]["aggs"] = {};
            for (var i = 0; i < this.aggs.length; i++) {
                $.extend(obj[this.name]["aggs"], this.aggs[i].objectify());
            }
        }

        return obj;
    }

    _parse_wrapper(obj, type) {
        this.name = Object.keys(obj)[0];
        var body = obj[this.name][type];

        var aggs = obj[this.name].aggs ? obj[this.name].aggs : obj[this.name].aggregations;
        if (aggs) {
            var anames = Object.keys(aggs);
            for (var i = 0; i < anames.length; i++) {
                var name = anames[i];
                var agg = aggs[anames[i]];
                var subtype = Object.keys(agg)[0];
                var raw = {};
                raw[name] = agg;
                var oa = es.aggregationFactory(subtype, {raw: raw});
                if (oa) {
                    this.addAggregation(oa);
                }
            }
        }

        return body;
    }
};


es.Filter = class {
    static type = "filter";

    constructor(params) {
        this.field = params.field;
    }

    matches(other) {
        return this._baseMatch(other);
    }

    _baseMatch(other) {
        // type must match
        if (other.type !== this.type) {
            return false;
        }
        // field (if set) must match
        if (other.field && other.field !== this.field) {
            return false;
        }
        // otherwise this matches
        return true;
    }

    objectify() {}
    parse() {}
};


// Define the Query class
es.Query = class {
    constructor(params) {
        if (!params) { params = {}; }

        // Properties initialization
        this.filtered = false;  // no longer present in ES 5.x+
        this.trackTotalHits = true;  // FIXME: hard code this for now

        // Initialize with default values or from params
        this.size = es.getParam(params.size, false);
        this.from = es.getParam(params.from, false);
        this.fields = es.getParam(params.fields, []);
        this.aggs = es.getParam(params.aggs, []);
        this.must = es.getParam(params.must, []);
        this.mustNot = es.getParam(params.mustNot, []);
        this.should = es.getParam(params.should, []);
        this.minimumShouldMatch = es.getParam(params.minimumShouldMatch, false);

        // Defaults from properties set through their setters
        this.queryString = false;
        this.sort = [];

        // Properties awaiting implementation
        this.source = es.getParam(params.source, false);
        this.partialFields = es.getParam(params.partialFields, false); // using partialFields instead of partialField
        this.scriptFields = es.getParam(params.scriptFields, false);

        // For older ES versions, may not be implemented
        this.facets = es.getParam(params.facets, []);

        // Final part of construction - set dynamic properties via their setters
        if (params.queryString) {
            this.setQueryString(params.queryString);
        }

        if (params.sort) {
            this.setSortBy(params.sort);
        }

        // Parse raw query if provided
        if (params.raw) {
            this.parse(params.raw);
        }
    }

    // Getters and Setters
    getSize() {
        return this.size !== undefined && this.size !== false ? this.size : 10;
    }

    getFrom() {
        return this.from || 0;
    }

    addField(field) {
        if (!this.fields.includes(field)) {
            this.fields.push(field);
        }
    }

    setQueryString(params) {
        let qs = params;
        if (!(params instanceof es.QueryString)) {
            if ($.isPlainObject(params)) {
                qs = new es.QueryString(params);
            } else {
                qs = new es.QueryString({ queryString: params });
            }
        }
        this.queryString = qs;
    }

    getQueryString() {
        return this.queryString;
    }

    removeQueryString() {
        this.queryString = false;
    }

    setSortBy(params) {
        this.sort = [];
        let sorts = Array.isArray(params) ? params : [params];
        sorts.forEach(sort => this.addSortBy(sort));
    }

    addSortBy(params) {
        let sort = params instanceof es.Sort ? params : new es.Sort(params);
        if (!this.sort.some(existingSort => existingSort.field === sort.field)) {
            this.sort.push(sort);
        }
    }

    prependSortBy(params) {
        let sort = params instanceof es.Sort ? params : new es.Sort(params);
        this.removeSortBy(sort);
        this.sort.unshift(sort);
    }

    removeSortBy(params) {
        let sort = params instanceof es.Sort ? params : new es.Sort(params);
        this.sort = this.sort.filter(existingSort => existingSort.field !== sort.field);
    }

    getSortBy() {
        return this.sort;
    }

    setSourceFilters(params) {
        this.source = this.source || { include: [], exclude: [] };
        if (params.include) {
            this.source.include = params.include;
        }
        if (params.exclude) {
            this.source.exclude = params.exclude;
        }
    }

    addSourceFilters(params) {
        this.source = this.source || { include: [], exclude: [] };
        if (params.include) {
            this.source.include.push(...params.include);
        }
        if (params.exclude) {
            this.source.exclude.push(...params.exclude);
        }
    }

    getSourceIncludes() {
        return this.source && this.source.include ? this.source.include : [];
    }

    getSourceExcludes() {
        return this.source && this.source.exclude ? this.source.exclude : [];
    }

    // Aggregation Methods
    getAggregation(params) {
        return this.aggs.find(agg => agg.name === params.name);
    }

    addAggregation(agg, overwrite) {
        if (overwrite) {
            this.removeAggregation(agg.name);
        }
        this.aggs.push(agg);
    }

    removeAggregation(name) {
        this.aggs = this.aggs.filter(agg => agg.name !== name);
    }

    clearAggregations() {
        this.aggs = [];
    }

    listAggregations() {
        return this.aggs;
    }

    // Filter Methods
    addMust(filter) {
        if (!this.listMust().some(existingFilter => {
            return Object.keys(filter).every(key => existingFilter[key] === filter[key]);
        })) {
            this.must.push(filter);
        }
    }

    listMust() {
        return this.must;
    }

    removeMust(template) {
        let removedCount = 0;
        this.must = this.must.filter(filter => {
            
            // Check if filter values match the template values
            const matches = Object.keys(template).every(key => filter[key] === template[key]);
            if (matches) {
                removedCount++;
            }
            return !matches;
        });
        return removedCount;
    }
    clearMust() {
        this.must = [];
    }

    addMustNot(filter) {
        if (!this.listMustNot().some(existingFilter => {
            return Object.keys(filter).every(key => existingFilter[key] === filter[key]);
        })) {
            this.mustNot.push(filter);
        }
    }

    listMustNot() {
        return this.mustNot;
    }

    removeMustNot(template) {
        let removedCount = 0;
        this.mustNot = this.mustNot.filter(filter => {
            const matches = Object.keys(template).every(key => filter[key] === template[key]);
            if (matches) {
                removedCount++;
            }
            return !matches;
        });
        return removedCount;
    }

    clearMustNot() {
        this.mustNot = [];
    }

    addShould(filter) {
        if (!this.listShould().some(existingFilter => {
            return Object.keys(filter).every(key => existingFilter[key] === filter[key]);
        })) {
            this.should.push(filter);
        }
    }

    listShould() {
        return this.should;
    }

    removeShould(template) {
        let removedCount = 0;
        this.should = this.should.filter(filter => {
            const matches = Object.keys(template).every(key => filter[key] === template[key]);
            if (matches) {
                removedCount++;
            }
            return !matches;
        });
        return removedCount;
    }

    clearShould() {
        this.should = [];
    }

    // Interrogative Methods
    hasFilters() {
        return this.must.length > 0 || this.should.length > 0 || this.mustNot.length > 0;
    }

    listFilters(params) {
        const { boolType, template } = params;
        const matchesTemplate = filter => {
            return Object.keys(template).every(key => filter[key] === template[key]);
        };
    
        switch (boolType) {
            case 'must':
                return this.listMust().filter(matchesTemplate);
            case 'should':
                return this.listShould().filter(matchesTemplate);
            case 'must_not':
                return this.listMustNot().filter(matchesTemplate);
            default:
                return [];
        }
    }    

    // Parsing and Serialization
    merge(source) {
        this.filtered = source.filtered;
        if (source.size) {
            this.size = source.size;
        }
        if (source.from) {
            this.from = source.from;
        }
        if (source.fields && source.fields.length > 0) {
            source.fields.forEach(field => this.addField(field));
        }
        source.aggs.forEach(agg => this.addAggregation(agg, true));
        source.must.forEach(filter => this.addMust(filter));
        source.mustNot.forEach(filter => this.addMustNot(filter));
        source.should.forEach(filter => this.addShould(filter));
        if (source.minimumShouldMatch !== false) {
            this.minimumShouldMatch = source.minimumShouldMatch;
        }
        if (source.getQueryString()) {
            this.setQueryString(source.getQueryString());
        }
        if (source.sort && source.sort.length > 0) {
            source.sort.reverse().forEach(sort => this.prependSortBy(sort));
        }
        if (source.source) {
            this.addSourceFilters({ include: source.getSourceIncludes(), exclude: source.getSourceExcludes() });
        }
    }

    objectify(params) {
        params = params || {};
        const {
            include_query_string = true,
            include_filters = true,
            include_paging = true,
            include_sort = true,
            include_fields = true,
            include_aggregations = true,
            include_source_filters = true
        } = params;

        const query_part = {};
        const bool = {};

        if (this.queryString && include_query_string) {
            Object.assign(query_part, this.queryString.objectify());
        }

        if (include_filters) {
            if (this.must.length > 0) {
                bool.must = this.must.map(filter => filter.objectify());
            }
            if (this.mustNot.length > 0) {
                bool.must_not = this.mustNot.map(filter => filter.objectify());
            }
            if (this.should.length > 0) {
                bool.should = this.should.map(filter => filter.objectify());
            }
            if (this.minimumShouldMatch !== false) {
                bool.minimum_should_match = this.minimumShouldMatch;
            }
        }

        if (Object.keys(query_part).length === 0 && Object.keys(bool).length === 0) {
            query_part.match_all = {};
        } else if (Object.keys(query_part).length === 0 && Object.keys(bool).length > 0) {
            query_part.bool = bool;
        }

        const obj = {
            query: query_part
        };

        if (include_paging) {
            obj.from = this.getFrom();
            obj.size = this.getSize();
        }

        if (include_sort && this.sort.length > 0) {
            obj.sort = this.sort.map(sort => sort.objectify());
        }

        if (include_fields && this.fields.length > 0) {
            obj.fields = this.fields.slice(); // Shallow copy of fields array
        }

        if (include_aggregations && this.aggs.length > 0) {
            obj.aggs = this.aggs.map(agg => agg.objectify());
        }

        if (include_source_filters && this.source) {
            obj._source = {};
            if (this.source.include && this.source.include.length > 0) {
                obj._source.includes = this.source.include.slice(); // Shallow copy of include array
            }
            if (this.source.exclude && this.source.exclude.length > 0) {
                obj._source.excludes = this.source.exclude.slice(); // Shallow copy of exclude array
            }
        }

        return obj;
    }

    clone() {
        const cloneParams = {
            size: this.size,
            from: this.from,
            fields: [...this.fields], // Shallow copy of fields array
            aggs: this.aggs.map(agg => ({ ...agg })), // Shallow copy of aggs array
            must: this.must.map(filter => ({ ...filter })), // Shallow copy of must array
            mustNot: this.mustNot.map(filter => ({ ...filter })), // Shallow copy of mustNot array
            should: this.should.map(filter => ({ ...filter })), // Shallow copy of should array
            minimumShouldMatch: this.minimumShouldMatch,
            queryString: this.queryString ? { ...this.queryString } : null, // Shallow copy of queryString if present
            sort: this.sort.map(sort => ({ ...sort })), // Shallow copy of sort array
            source: this.source ? {
                include: [...this.source.include], // Shallow copy of include array
                exclude: [...this.source.exclude] // Shallow copy of exclude array
            } : null,
            partialFields: this.partialFields,
            scriptFields: this.scriptFields
            // Add any other properties that need to be cloned
        };

        return new es.Query(cloneParams);
    }
}

es.QueryString = class {
    constructor(params) {
        this.queryString = params.queryString || false;
        this.defaultField = params.defaultField || false;
        this.defaultOperator = params.defaultOperator || "OR";

        this.fuzzify = params.fuzzify || false;     // * or ~
        this.escapeSet = params.escapeSet || es.specialCharsSubSet;
        this.pairs = params.pairs || es.characterPairs;
        this.unEscapeSet = params.unEscapeSet || es.specialChars;

        if (params.raw) {
            this.parse(params.raw);
        }
    }

    objectify() {
        const qs = this._escape(this._fuzzify(this.queryString));
        const obj = { q: qs };
        if (this.defaultOperator) {
            obj["q.op"] = this.defaultOperator;
        }
        if (this.defaultField) {
            obj["df"] = this.defaultField;
        }
        return obj;
    }

    clone() {
        return new es.QueryString({
            queryString: this.queryString,
            defaultField: this.defaultField,
            defaultOperator: this.defaultOperator,
            fuzzify: this.fuzzify,
            escapeSet: this.escapeSet.slice(), // Shallow copy of escapeSet array
            pairs: this.pairs.slice(), // Shallow copy of pairs array
            unEscapeSet: this.unEscapeSet.slice() // Shallow copy of unEscapeSet array
        });
    }

    parse(obj) {
        if (obj.q) {
            this.queryString = this._unescape(obj.q);
        }
        if (obj["q.op"]) {
            this.defaultOperator = obj["q.op"];
        }
        if (obj.df) {
            this.defaultField = obj.df;
        }
    }

    _fuzzify(str) {
        if (!this.fuzzify || !(this.fuzzify === "*" || this.fuzzify === "~")) {
            return str;
        }

        if (!(str.includes('*') || str.includes('~') || str.includes(':'))) {
            return str;
        }

        let pq = "";
        const optparts = str.split(' ');
        for (let i = 0; i < optparts.length; i++) {
            let oip = optparts[i];
            if (oip.length > 0) {
                oip += this.fuzzify;
                if (this.fuzzify === "*") {
                    oip = "*" + oip;
                }
                pq += oip + " ";
            }
        }
        return pq.trim();
    }

    _escapeRegExp(string) {
        return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }

    _replaceAll(string, find, replace) {
        return string.replace(new RegExp(this._escapeRegExp(find), 'g'), replace);
    }

    _unReplaceAll(string, find) {
        return string.replace(new RegExp("\\\\" + this._escapeRegExp(find), 'g'), find);
    }

    _paired(string, pair) {
        const matches = (string.match(new RegExp(this._escapeRegExp(pair), "g"))) || [];
        return matches.length % 2 === 0;
    }

    _escape(str) {
        let scs = this.escapeSet.slice(); // Make a copy of escapeSet
        for (let i = 0; i < this.pairs.length; i++) {
            const char = this.pairs[i];
            if (!this._paired(str, char)) {
                scs.push(char);
            }
        }
        for (let i = 0; i < scs.length; i++) {
            const char = scs[i];
            str = this._replaceAll(str, char, "\\" + char);
        }
        return str;
    }

    _unescape(str) {
        for (let i = 0; i < this.unEscapeSet.length; i++) {
            const char = this.unEscapeSet[i];
            str = this._unReplaceAll(str, char);
        }
        return str;
    }
};

// Factories
es.aggregationFactory = function(type, params) {
    for (const [key, value] of Object.entries(es)) {
        if (es._classExtends(es[key], es.Aggregation)) {
            if (es[key].type === type) {
                // Convert Elasticsearch specific parameters to es if needed
                if (type === "terms") {
                    params.field = params.field || false;
                    params.size = params.size || 10; // Use 'rows' for Solr, mapped from 'size'
                    params.orderBy = params.orderBy || "_count";
                    if (params.orderBy[0] !== "_") {
                        params.orderBy = "_" + params.orderBy;
                    }
                    params.orderDir = params.orderDir || "desc";
                }
                return new es[key](params);
            }
        }
    }
    throw new Error(`Unknown aggregation type: ${type}`);
};

es.filterFactory = function(type, params) {
    // query string is a special case
    if (type === "query_string") {
        return new es.QueryString(params);
    }

    // otherwise auto-detect
    for (const [key, value] of Object.entries(es)) {
        if (es._classExtends(es[key], es.Filter)) {
            if (es[key].type === type) {
                // Convert Elasticsearch specific parameters to Solr if needed
                if (type === "terms") {
                    params.field = params.field || false;
                    params.values = params.values || [];
                    params.execution = params.execution || false;
                }
                return new es[key](params);
            }
        }
    }
    throw new Error(`Unknown filter type: ${type}`);
};

// Filter extended classes starts here
es.TermFilter = class extends es.Filter {
    static type = "term";

    constructor(params) {
        super(params);
        // this.filter handled by superclass
        this.value = params.value || false;

        if (params.raw) {
            this.parse(params.raw);
        }
    }

    matches(other) {
        // ask the parent object first
        let pm = this._baseMatch(other);
        if (!pm) {
            return false;
        }
        // value (if set) must match
        if (other.value && other.value !== this.value) {
            return false;
        }

        return true;
    }

    objectify() {
        // Solr-specific object structure
        var obj = {};
        obj[this.field] = this.value;
        return obj;
    }

    parse(obj) {
        // Solr-specific parsing
        this.field = Object.keys(obj)[0];
        this.value = obj[this.field];
    }
}

es.TermsFilter = class extends es.Filter {
    static type = "terms";

    constructor(params) {
        super(params);
        // this.field handled by superclass
        this.values = params.values || false;
        this.execution = params.execution || false;

        if (params.raw) {
            this.parse(params.raw);
        }
    }

    matches(other) {
        // ask the parent object first
        let pm = this._baseMatch(other);
        if (!pm) {
            return false;
        }

        // values (if set) must be the same list
        if (other.values) {
            if (other.values.length !== this.values.length) {
                return false;
            }
            for (var i = 0; i < other.values.length; i++) {
                if ($.inArray(other.values[i], this.values) === -1) {
                    return false;
                }
            }
        }

        return true;
    }

    objectify() {
        var val = this.values || [];
        var filterQuery = val.map(value => `${this.field}:${value}`).join(' OR ');
        return { fq: filterQuery };
    }

    parse(obj) {
        if (obj.fq) {
            let terms = obj.fq.split(' OR ');
            let field = terms[0].split(':')[0];
            let values = terms.map(term => term.split(':')[1]);

            this.field = field;
            this.values = values;
        }
    }

    add_term(term) {
        if (!this.values) {
            this.values = [];
        }
        if ($.inArray(term, this.values) === -1) {
            this.values.push(term);
        }
    }

    has_term(term) {
        if (!this.values) {
            return false;
        }
        return $.inArray(term, this.values) >= 0;
    }

    remove_term(term) {
        if (!this.values) {
            return;
        }
        var idx = $.inArray(term, this.values);
        if (idx >= 0) {
            this.values.splice(idx, 1);
        }
    }

    has_terms() {
        return (this.values !== false && this.values.length > 0);
    }

    term_count() {
        return this.values === false ? 0 : this.values.length;
    }

    clear_terms() {
        this.values = false;
    }
};


//  Aggregation extended classes starts here
es.TermsAggregation = class extends es.Aggregation {
    static type = "terms";

    constructor(params) {
        super(params);
        this.field = params.field || false;
        this.size = params.size || 10; // 'size' in Elasticsearch, will convert to 'rows' for Solr

        // set the ordering for the first time
        this.orderBy = "_count";
        if (params.orderBy) {
            this.orderBy = params.orderBy;
            if (this.orderBy[0] !== "_") {
                this.orderBy = "_" + this.orderBy;
            }
        }
        this.orderDir = params.orderDir || "desc";

        if (params.raw) {
            this.parse(params.raw);
        }
    }

    // provide a method to set and normalize the ordering in future
    setOrdering(orderBy, orderDir) {
        this.orderBy = orderBy;
        if (this.orderBy[0] !== "_") {
            this.orderBy = "_" + this.orderBy;
        }
        this.orderDir = orderDir;
    }

    objectify() {
        // Solr facets configuration
        const body = {
            field: this.field,
            rows: this.size, // Convert 'size' to 'rows' for Solr
            order: {}
        };

        // Translate Elasticsearch orderBy to Solr sort
        let solrSort = "";
        if (this.orderBy === "_count") {
            solrSort = "count";
        } else if (this.orderBy === "_term") {
            solrSort = "index";
        }
        body.order[solrSort] = this.orderDir;

        return this._make_aggregation(es.TermsAggregation.type, body);
    }

    parse(obj) {
        const body = this._parse_wrapper(obj, es.TermsAggregation.type);
        this.field = body.field;
        if (body.rows) {
            this.size = body.rows; // Convert 'rows' to 'size'
        }
        if (body.order) {
            const solrSort = Object.keys(body.order)[0];
            this.orderDir = body.order[solrSort];

            // Translate Solr sort back to Elasticsearch orderBy
            if (solrSort === "count") {
                this.orderBy = "_count";
            } else if (solrSort === "index") {
                this.orderBy = "_term";
            }
        }
    }
};



es.doQuery = (params) => {
	const { success, error, complete, search_url, query, datatype } = params;
	
	const solrArgs = this._es2solr({ query : query });
	const searchUrl = search_url;
	// Generate the Solr query URL
	const fullUrl = this._args2URL({ baseUrl: searchUrl, args: solrArgs });
    
	var error_callback = es.queryError(error);
	var success_callback = es.querySuccess(success, error_callback);

	// Execution of solr query
	$.get({
		url: fullUrl,
		datatype: datatype ? datatype : "jsonp",
		success: success_callback,
		error: error_callback,
		jsonp: 'json.wrf'
	});
	
};

es.querySuccess = function (callback, error_callback) {
	return function(data) {
		if (data.hasOwnProperty("error")) {
			error_callback(data);
			return;
		}

		var result = new es.Result({raw: data});
		callback(result);
	}
};

es.queryError = function (callback) {
	return function(data) {
		if (callback) {
			callback(data);
		} else {
			throw new Error(data);
		}
	}
};

es.Result = class {
	constructor(params) {
        this.data = JSON.parse(params.raw);
    }

    buckets(facet_name) {
        if (this.data.facet_counts) {
            if (this.data.facet_counts.facet_fields && this.data.facet_counts.facet_fields[facet_name]) {
                return this._convertFacetToBuckets(this.data.facet_counts.facet_fields[facet_name]);
            } else if (this.data.facet_counts.facet_queries && this.data.facet_counts.facet_queries[facet_name]) {
                return this._convertFacetToBuckets(this.data.facet_counts.facet_queries[facet_name]);
            }
        }
        return [];
    }

    _convertFacetToBuckets(facet) {
        let buckets = [];
        for (let i = 0; i < facet.length; i += 2) {
            buckets.push({
                key: facet[i],
                doc_count: facet[i + 1]
            });
        }
        return buckets;
    }

    aggregation(facet_name) {
        return {
            buckets: this.buckets(facet_name)
        };
    }

    results() {
        var res = [];
        if (this.data.response && this.data.response.docs) {
            for (var i = 0; i < this.data.response.docs.length; i++) {
                res.push(this.data.response.docs[i]);
            }
        }
        return res;
    }

    total() {
        if (this.data.response && this.data.response.numFound !== undefined) {
            return parseInt(this.data.response.numFound);
        }
        return false;
    }
};


// Helper functions
// Method to convert es query to Solr query
function _es2solr({ query }) {
	const solrQuery = {};
	let solrFacets = []

	// Handle the query part
	if (query.query) {
		const queryPart = query.query;
		if (queryPart.match) {
			const field = Object.keys(queryPart.match)[0];
			const value = queryPart.match[field];
			solrQuery.q = `${field}:${value}`;
		} else if (queryPart.range) {
			const field = Object.keys(queryPart.range)[0];
			const range = queryPart.range[field];
			const rangeQuery = `${field}:[${range.gte || '*'} TO ${range.lte || '*'}]`;
			solrQuery.fq = rangeQuery;
		} else if (queryPart.match_all) {
			solrQuery.q = `*:*`;
		}
	} else {
		solrQuery.q = `*:*`;
	}

	// Handle pagination
	if (query.from !== undefined) {
		if (typeof query.from == "boolean" && !query.from) {
			solrQuery.start = 0
		} else {
			solrQuery.start = query.from;
		}
	}
	if (query.size !== undefined) {
		if (typeof query.size == "boolean" && !query.size) {
			solrQuery.rows = 10
		} else {
			solrQuery.rows = query.size;
		}

	}

	// Handle sorting
	if (query && query.sort &&  query.sort.length > 0) {
		solrQuery.sort = query.sort.map(sortOption => {
			const sortField = sortOption.field;
			const sortOrder = sortOption.order === "desc" ? "desc" : "asc";
			return `${sortField} ${sortOrder}`;
		}).join(', ');
	}

    if (query.queryString && query.queryString.queryString) {
        const esQueryString = query.queryString.queryString;
        const searchField = query.queryString.defaultField;
        let operator = query.queryString.defaultOperator;

        if(typeof esQueryString == 'boolean') {
            throw new Error('Search string needs to be string got boolean');
        }

        if (operator == '') {
            operator = "OR"
        }

        if (esQueryString != "") {
            if (typeof searchField == 'boolean') {
                solrQuery.q = `${solrQuery.q} ${operator} ${esQueryString}`;
            } else {
                solrQuery.q = `${solrQuery.q} ${operator} ${searchField}:${esQueryString}`;
            }
        }
    }

	if (query && query.aggs && query.aggs.length > 0) {
		let facetsFields = query.aggs.map(agg => this._convertAggFieldToFacetField(agg));
        query.aggs.forEach(agg => {
            _convertAggLimitToFacetLimit(agg, solrQuery);
            _convertAggSortToFacetSort(agg, solrQuery);
        });
        solrQuery.facet = true
        solrQuery["facet.field"] = facetsFields.join(",")
	}

    if(query && query.must && query.must.length > 0) {
        query.must.forEach(mustQuery => {
            solrQuery.q = `${mustQuery.field}:${mustQuery.value}`
        });
    }

    if(query && query.mustNot && query.mustNot.length > 0) {
        query.mustNot.forEach(mustNotq => {
            solrQuery.q = `-${mustNotq.field}:${mustNotq.value}`
        });
    }

    if(query && query.should && query.should.length > 0) {
        query.should.forEach(shouldQ => {
            solrQuery.q = `(${shouldQ.field}:${shouldQ.value})^1.0`
        });
    }

	solrQuery.wt = "json"

	return solrQuery;
}

function  _args2URL({ baseUrl, args }) {
	const qParts = Object.keys(args).flatMap(k => {
		const v = args[k];
		if (Array.isArray(v)) {
			return v.map(item => `${encodeURIComponent(k)}=${encodeURIComponent(item)}`);
		}
		return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
	});

	const qs = qParts.join("&");
	return `${baseUrl}?${qs}`;
}

function _convertAggFieldToFacetField(agg) {
	const field = agg.field;
	const name = agg.name;

	return `{!key=${name}}${field}`;
}   

function _convertAggLimitToFacetLimit(agg , solrQuery) {
    const size = agg.size || 10; 	// default size if not specified
    const field = agg.field;

    solrQuery[`f.${field}.facet.limit`] = size
}

function _convertAggSortToFacetSort(agg , solrQuery) {
    const order = agg.orderBy === "_count" ? "count" : "index"; // mapping orderBy to Solr
	const direction = agg.orderDir === "desc" ? "desc" : "asc"; // default direction if not specified
    const field = agg.field;

    solrQuery[`f.${field}.facet.sort`] = `${order}|${direction}`
}


es.getParam = function(value, def) {
    return value !== undefined ? value : def;
}