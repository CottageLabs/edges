/**
 * This file demonstrates how best to document a JS application which has Edges structure
 */

/** @namespace  parent*/
var parent = {
    /**
     * A function in the parent object, where the object is explicitly declared.
     *
     * Notice how it is different to how we declare a function where we have used $.extend() later on.  No @memberof is required here.
     *
     * @param {Object} params some parameter
     * @returns {Object} a set of ranges of the form {range : [start, end]}
     */
    parentFn : function(params) {

    }
};

/** @namespace  parent*/
$.extend(parent, {


    /** @namespace parent.child */
    child: {
        /**
         * Use this to construct the {@link parent.child.Class}
         *
         * @type {Function}
         * @memberof parent.child
         * @returns {parent.child.Class}
         */
        newClass: function (params) {
            if (!params) {
                params = {}
            }
            return new parent.child.Class(params);
        },
        /**
         * You should construct this using {@link parent.child.newClass}
         *
         * @constructor
         * @memberof parent.child
         * @params
         */
        Class: function (params) {
            /**
             * This is a plain old member variable
             * @type {Boolean}
             */
            this.member = false;

            // this is a member variable that doesn't need to be externally documented
            this.namespace = "muk-publisher-report-template";

            /**
             * This is a member function
             *
             * @type {Function}
             * @param params {Object} Some parameters
             * @returns {Boolean} whether it's true or not
             */
            this.memberFn = function (params) {
                return true;
            };

            /**
             * Event handler which, when activated calls
             * {@link parent.child.Class#memberFn}
             *
             * @type {Function}
             * @param {DOM} element DOM element on which the event occurred
             */
            this.eventHandler = function (element) {
                this.memberFn();
            };
        }
    }
});