// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("components")) { edges.components = {}}

edges.components.MultiFieldRangeSelector = class extends edges.Component {
    constructor(params) {
        super(params);

        /*
        * [
        *     {
        *         field: "field.path",
        *         display: "Display Name"
        *     }
        * ]
         */
        this.fields = edges.util.getParam(params, "fields", []);

        this.constraintFieldModifier = edges.util.getParam(params, "constraintFieldModifier", false);

        this.fieldNormaliser = edges.util.getParam(params, "fieldNormaliser", false);

        this.selectedRanges = {};
    }

    synchronise() {
        this.selectedRanges = {};

        if (!this.edge.result) {
            return;
        }

        for (let field of this.fields) {
            if (this.constraintFieldModifier) {
                let gteField = this.constraintFieldModifier("gte", field.field);
                let lteField = this.constraintFieldModifier("lte", field.field);

                let gteFilters = this.edge.currentQuery.listMust(new es.RangeFilter({field: gteField}));
                if (gteFilters.length > 0) {
                    let lte = gteFilters[0].lte;
                    let gte = gteFilters[0].gte;
                    let obj = {};
                    if (lte !== false) {
                        obj["lte"] = lte
                    }
                    if (gte !== false) {
                        obj["gte"] = gte
                    }
                    if (!(gteField in this.selectedRanges)) {
                        this.selectedRanges[gteField] = obj;
                    } else {
                        this.selectedRanges[gteField] = {...this.selectedRanges[gteField], ...obj}
                    }
                }

                let lteFilters = this.edge.currentQuery.listMust(new es.RangeFilter({field: lteField}));
                if (lteFilters.length > 0) {
                    let lte = lteFilters[0].lte;
                    let gte = lteFilters[0].gte;
                    let obj = {};
                    if (lte !== false) {
                        obj["lte"] = lte
                    }
                    if (gte !== false) {
                        obj["gte"] = gte
                    }
                    if (!(lteField in this.selectedRanges)) {

                        this.selectedRanges[lteField] = obj;
                    } else {
                        this.selectedRanges[lteField] = {...this.selectedRanges[lteField], ...obj}
                    }
                }
            } else {
                let filters = this.edge.currentQuery.listMust(new es.RangeFilter({field: field.field}));
                if (filters.length === 0) {
                    continue;
                }
                let lte = filters[0].lte;
                let gte = filters[0].gte;
                let obj = {};
                if (lte !== false) {
                    obj["lte"] = lte
                }
                if (gte !== false) {
                    obj["gte"] = gte
                }
                this.selectedRanges[field.field] = obj;
            }
        }
    }

    normalisedRanges() {
        if (!this.fieldNormaliser) {
            return this.selectedRanges;
        }

        let norm = {};
        for (let field in this.selectedRanges) {
            let nfield = this.fieldNormaliser(field);
            if (!(nfield in norm)) {
                norm[nfield] = this.selectedRanges[field]
            } else {
                norm[nfield] = {...norm[nfield], ...this.selectedRanges[field]}
            }
        }
        return norm;
    }

    removeRangeOnField(params) {
        let field = edges.util.getParam(params, "field", false);
        let constraint = edges.util.getParam(params, "constraint", false);
        let number = edges.util.getParam(params, "number", false);
        let cycle = edges.util.getParam(params, "cycle", true);

        if (this.constraintFieldModifier) {
            field = this.constraintFieldModifier(constraint, field);
        }

        let nq = this.edge.cloneQuery();

        if (field in this.selectedRanges) {
            delete this.selectedRanges[field][constraint];
            if (Object.keys(this.selectedRanges[field]).length === 0) {
                delete this.selectedRanges[field]
            }

            let spec = {field: field}
            if (constraint === "gte") {
                spec["gte"] = number;
            } else {
                spec["lte"] = number;
            }
            nq.removeMust(new es.RangeFilter(spec));
        }

        if (cycle) {
            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.cycle();
        } else {
            this.edge.pushQuery(nq);
        }
    }

    setRangeOnField(params) {
        let field = edges.util.getParam(params, "field", false);
        let constraint = edges.util.getParam(params, "constraint", false);
        let number = edges.util.getParam(params, "number", false);

        if (field === false || constraint === false || number === false) {
            return;
        }

        if (this.constraintFieldModifier) {
            field = this.constraintFieldModifier(constraint, field);
        }

        let nq = this.edge.cloneQuery();

        if (field in this.selectedRanges) {
            this.selectedRanges[field][constraint] = number;

            nq.removeMust(new es.RangeFilter({
                field: field
            }));
        } else {
            this.selectedRanges[field] = {}
            this.selectedRanges[field][constraint] = number;
        }

        // just add a new term filter (the query builder will ensure there are no duplicates)
        // this means that the behaviour here is that terms are ANDed together
        nq.addMust(new es.RangeFilter({
            field: field,
            lte: this.selectedRanges[field]["lte"],
            gte: this.selectedRanges[field]["gte"]
        }));

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }
}