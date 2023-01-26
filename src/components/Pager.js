// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("components")) { edges.components = {}}

edges.components.Pager = class extends edges.Component {
    constructor (params) {
        super(params);

        ///////////////////////////////////////
        // internal state

        this.from = false;
        this.to = false;
        this.total = false;
        this.page = false;
        this.pageSize = false;
        this.totalPages = false;
    }

    synchronise() {
        // reset the state of the internal variables
        this.from = false;
        this.to = false;
        this.total = false;
        this.page = false;
        this.pageSize = false;
        this.totalPages = false;

        // calculate the properties based on the latest query/results
        if (this.edge.currentQuery) {
            this.from = parseInt(this.edge.currentQuery.getFrom()) + 1;
            this.pageSize = parseInt(this.edge.currentQuery.getSize());
        }
        if (this.edge.result) {
            this.total = this.edge.result.total()
        }
        if (this.from !== false && this.total !== false) {
            this.to = this.from + this.pageSize - 1;
            this.page = Math.ceil((this.from - 1) / this.pageSize) + 1;
            this.totalPages = Math.ceil(this.total / this.pageSize)
        }
    }

    setFrom(from) {
        var nq = this.edge.cloneQuery();

        from = from - 1; // account for the human readability of the value, ES is 0 indexed here
        if (from < 0) {
            from = 0;
        }
        nq.from = from;

        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    setSize(size) {
        var nq = this.edge.cloneQuery();
        nq.size = size;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    decrementPage() {
        var from = this.from - this.pageSize;
        this.setFrom(from);
    }

    incrementPage() {
        var from = this.from + this.pageSize;
        this.setFrom(from);
    }

    goToPage(params) {
        var page = params.page;
        var nf = ((page - 1) * this.pageSize) + 1;  // we're working with the human notion of from, here, so is indexed from 1
        this.setFrom(nf);
    }
}