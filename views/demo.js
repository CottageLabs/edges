import edges from "../src/edges"
import {Facetview} from "../src/templates/bs3/Facetview";
import {RefiningANDTermSelector} from "../src/components/RefiningANDTermSelector";
import {RefiningANDTermSelectorRenderer} from "../src/renderers/bs3/RefiningANDTermSelectorRenderer";
import {ResultsDisplay} from "../src/components/ResultsDisplay";
import {ResultsFieldsByRowRenderer} from "../src/renderers/bs3/ResultsFieldsByRowRenderer";

global.demo = new edges.Edge({
    selector: "#edge_container",
    searchUrl: "http://localhost:9200/doaj-journal/doc/_search",
    template: new Facetview(),
    components : [
        new RefiningANDTermSelector({
            id: "journal_license",
            category: "facet",
            field: "index.license.exact",
            renderer: new RefiningANDTermSelectorRenderer({
                title: "Journal License",
                controls: true,
                open: true,
                togglable: true
            })
        }),
        new ResultsDisplay({
            id: "results",
            category: "results",
            renderer: new ResultsFieldsByRowRenderer({
                rowDisplay : [
                    [{ field: "bibjson.title" }],
                    [{
                        "pre" : "<strong>Editor Group</strong>: ",
                        "field" : "admin.editor_group"
                    }]
                ]
            })
        })
    ]
})

export default demo