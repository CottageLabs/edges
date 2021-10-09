import {Template} from "../../core";
import {getParam} from "../../utils";

export class ComponentList extends Template {
    constructor(params) {
        super();
        this.title = getParam(params, "title", "");
    }
    
    draw(edge) {
        this.edge = edge;
        let frag = this.title;
        for (let i = 0; i < edge.components.length; i++) {
            frag += `<div id="` + edge.components[i].id + `"></div>`;
        }
        this.edge.context.html(frag);
    }
}