/* global $, jQuery, es */

window.es = window.es || {};
var es = window.es;

window.edges = window.edges || {};
var edges = window.edges;
if (!edges.hasOwnProperty("components")) { edges.components = {}}

edges.components.Compound = class extends edges.Component {
    constructor(params) {
        super(params);
        this.components = edges.util.getParam(params, "components");
    }

    init(edge) {
        super.init(edge);
        for (let i = 0; i < this.components.length; i++) {
            let comp = this.components[i];
            comp.init(edge);
        }
    }

    contrib(query) {
        for (let i = 0; i < this.components.length; i++) {
            let comp = this.components[i];
            comp.contrib(query);
        }
    }

    draw() {
        super.draw();
        for (let i = 0; i < this.components.length; i++) {
            let comp = this.components[i];
            comp.init(this.edge);   // reinit so they can find their context
            comp.draw();
        }

    }

    sleep() {
        super.sleep();
        for (let i = 0; i < this.components.length; i++) {
            let comp = this.components[i];
            comp.sleep();
        }
    }

    wake() {
        super.wake();
        for (let i = 0; i < this.components.length; i++) {
            let comp = this.components[i];
            comp.wake();
        }
    };

    synchronise() {
        for (let i = 0; i < this.components.length; i++) {
            let comp = this.components[i];
            comp.synchronise();
        }
    }
}