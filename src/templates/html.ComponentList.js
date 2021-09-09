$.extend(true, edges, {
    html: {
        newComponentList : function(params) {
            return edges.instantiate(edges.html.ComponentList, params, edges.newTemplate);
        },
        ComponentList : function(params) {
            this.title = params.title || "";

            this.draw = function(edge) {
                this.edge = edge;
                let frag = this.title;
                for (let i = 0; i < edge.components.length; i++) {
                    frag += `<div id="` + edge.components[i].id + `"></div>`;
                }
                this.edge.context.html(frag);
            }
        }
    }
});