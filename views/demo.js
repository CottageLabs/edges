import edges from "../src/edges"

global.demo = new edges.Edge({
    searchUrl: "http://localhost:9200/doaj-journal/doc/_search"
})

export default demo