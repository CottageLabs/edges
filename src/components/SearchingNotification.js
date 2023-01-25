// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("components")) { edges.components = {}}

edges.components.SearchingNotification = class extends edges.Component {

    constructor(params) {
        super(params)

        this.finishedEvent = edges.util.getParam(params, "finishedEvent", "edges:query-success");

        this.searching = false;
    }

    init(edge) {
        super.init(edge);

        edge.context.on("edges:pre-query", edges.eventClosure(this, "searchingBegan"));
        edge.context.on("edges:query-fail", edges.eventClosure(this, "searchingFinished"));
        edge.context.on(this.finishedEvent, edges.eventClosure(this, "searchingFinished"));
    }

    // specifically disable this function
    draw() {}

    searchingBegan() {
        this.searching = true;
        this.renderer.draw();
    }

    searchingFinished() {
        this.searching = false;
        this.renderer.draw();
    }
}