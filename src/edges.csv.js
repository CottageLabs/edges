$.extend(edges, {
    csv : {
        serialise : function(params) {
            var json = params.data;
            return Papa.unparse(json, {newline: "\n"});
        },

        newObjectByRow : function(params) {
            if (!params) { params = {} }
            return new edges.csv.ObjectByRow(params);
        },
        ObjectByRow : function(params) {

            this.sheet = false;

            this.filters = [];

            // this is essentially the constructor
            this.parse = function(params) {
                var data = params.data.replace(/\r\n/g, "\n");
                this.sheet = Papa.parse(data, {
                    header: true,
                    newline: "\n"
                });
            };

            /////////////////////////////////////////////////
            // methods for interacting with the contents of the sheet

            this.add_filter = function(params) {
                var filter = params.filter;
                this.filters.push(filter);
            };

            this.clear_filter = function(params) {
                var filter = params.filter;
                var remove = false;
                for (var i = 0; i < this.filters.length; i++) {
                    var filt = this.filters[i];

                    var incomingTerm = Object.keys(filter)[0];
                    var incomingValue = filter[incomingTerm];
                    var internalTerm = Object.keys(filt)[0];
                    var internalValue = filt[internalTerm];

                    if (incomingTerm === internalTerm && incomingValue === internalValue) {
                        remove = i;
                        break;
                    }
                }
                if (remove !== false) {
                    this.filters.splice(remove, 1)
                }
            };

            this.iterator = function() {
                var count = 0;
                var that = this;
                return {
                    next : function() {
                        if (that.sheet.data.length <= count) {
                            return false;
                        }
                        for (var i = count; i < that.sheet.data.length; i++) {
                            var ret = that.sheet.data[i];
                            var match = that._filterMatch({record: ret});
                            if (match) {
                                count = i + 1;
                                return ret;
                            }
                        }
                        return false;
                    }
                }
            };

            this.aggregation = function(params) {
                var type = Object.keys(params)[0];
                var field = params[type];

                if (type === "terms") {
                    return this._termsAggregation({field : field});
                }
                return [];
            };

            this._termsAggregation = function(params) {
                var field = params.field;

                var agg = [];
                var aggMap = {};

                var iter = this.iterator();
                var res = iter.next();
                while (res) {
                    if (res.hasOwnProperty(field)) {
                        var val = res[field];
                        if (val in aggMap) {
                            agg[aggMap[val]].count++;
                        } else {
                            var i = agg.length;
                            agg.push({term: val, count: 1});
                            aggMap[val] = i;
                        }
                    }
                    res = iter.next();
                }

                return agg;
            };

            this._filterMatch = function(params) {
                var record = params.record;

                for (var i = 0; i < this.filters.length; i++) {
                    var filter = this.filters[i];
                    var field = Object.keys(filter)[0];
                    var val = filter[field];
                    if (record[field] !== val) {
                        return false;
                    }
                }

                return true;
            };

            ////////////////////////////////////////
            // call the constructor

            this.parse(params);
        }
    }
});
