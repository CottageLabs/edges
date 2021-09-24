import {QueryAdapter} from './adapter'

import {es} from '../../dependencies/es'

class ESQueryAdapter extends QueryAdapter {
    doQuery(params) {
        var edge = params.edge;
        var query = params.query;
        var success = params.success;
        var error = params.error;

        if (!query) {
            query = edge.currentQuery;
        }

        es.doQuery({
            search_url: edge.searchUrl,
            queryobj: query.objectify(),
            datatype: edge.datatype,
            success: success,
            error: error
        });
    };
}

export {ESQueryAdapter}