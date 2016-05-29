$.extend(edges, {
    async : {
        newProcessGroup : function(params) {
            if (!params) { params = {} }
            return new edges.ProcessGroup(params);
        },
        ProcessGroup : function(params) {
            this.list = params.list;
            this.successCallbackArgs = params.successCallbackArgs;
            this.errorCallbackArgs = params.errorCallbackArgs;

            var action = params.action;
            var success = params.success;
            var carryOn = params.carryOn;
            var error = params.error;

            this.functions = {
                action: action,
                success: success,
                carryOn: carryOn,
                error: error
            };

            this.checkList = [];

            this.finished = false;

            this.construct = function(params) {
                for (var i = 0; i < list.length; i++) {
                    this.checkList.push(0);
                }
            };

            this.process = function(params) {
                if (this.list.length == 0) {
                    this.functions.carryOn();
                }

                for (var i = 0; i < this.list.length; i++) {
                    var context = {index: i};

                    var success_callback = edges.objClosure(this, "_actionSuccess", this.successCallbackArgs, context);
                    var error_callback = edges.objClosure(this, "_actionError", this.successCallbackArgs, context);
                    var complete_callback = false;

                    this.action({entry: list[i],
                        success_callback: success_callback,
                        error_callback: error_callback,
                        complete_callback: complete_callback
                    });
                }
            };

            this._actionSuccess = function(params) {
                var index = params.index;
                delete params.index;

                params["entry"] = this.list[index];
                this.functions.success(params);
                this.checkList[index] = 1;

                if (this._isComplete()) {
                    this._finalise();
                }
            };

            this._actionError = function(params) {
                var index = params.index;
                delete params.index;

                params["entry"] = this.list[index];
                this.functions.error(params);
                this.checkList[index] = -1;

                if (this._isComplete()) {
                    this._finalise();
                }
            };

            this._actionComplete = function(params) {

            };

            this._isComplete = function() {
                return $.inArray(0, this.checkList) > -1;
            };

            this._finalise = function() {
                if (this.finished) {
                    return;
                }
                this.finished = true;
                this.functions.carryOn();
            };

            ////////////////////////////////////////
            this.construct();
        }
    }
});