// first define the bind with delay function from (saves loading it separately)
// https://github.com/bgrins/bindWithDelay/blob/master/bindWithDelay.js
(function($) {
    $.fn.bindWithDelay = function( type, data, fn, timeout, throttle ) {
        var wait = null;
        var that = this;

        if ( $.isFunction( data ) ) {
            throttle = timeout;
            timeout = fn;
            fn = data;
            data = undefined;
        }

        function cb() {
            var e = $.extend(true, { }, arguments[0]);
            var throttler = function() {
                wait = null;
                fn.apply(that, [e]);
            };

            if (!throttle) { clearTimeout(wait); }
            if (!throttle || !wait) { wait = setTimeout(throttler, timeout); }
        }

        return this.bind(type, data, cb);
    };
})(jQuery);
