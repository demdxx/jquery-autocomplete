/**
 * jQuery autocomplete extension
 *
 * @copyright Dmitry Ponomarev <demdxx@gmail.com>
 * @year 2012
 * @license MIT
 */

/**

 %% EVENTS:
 
    autocomplete_click          => event, item:htmlElement, config
    autocomplete_change         => event, item:htmlElement, list:jQObject, config
    autocomplete_afterchange    => event, item:htmlElement, list:jQObject, config
    autocomplete_test           => event, text, item:struct, config
    autocomplete_create         => event, data, text, config
    autocomplete_show           => event, show:bool, list:jQObject, config

 %% EXAMPLE:
 
    {{html}}
        <div class="search">
            <input type="text" />
            <div class="selector" style="display"><ul><li>There will be uploaded to the elements...</li></ul></div>
        </div>
    {{/html}}
    
    {{js}}
    
    $('.search input').autocomplete({
        source: [
			"ActionScript",
			"AppleScript",
			"Asp",
			"BASIC",
			"C",
			"C++",
			"Clojure",
			"COBOL",
			"ColdFusion",
			"Erlang",
			"Fortran",
			"Groovy",
			"Haskell",
			"Java",
			"JavaScript",
			"Lisp",
			"Perl",
			"PHP",
			"Python",
			"Ruby",
			"Scala",
			"Scheme"
        ],
        
        // If neede select concret list selector
        
        selector_list: function(config) { return $(this).next(); }, // get <div class="selector" ...
        selector_body: 'ul',
        selector_item: 'li'     // select from $selector_list
        
    });
    
    $('.search input').bind('autocomplete_click', function(event, item, config) {
        alert($(item).text());
    };
    
    {{/js}}

 */

(function($) {
	$.fn.autocomplete = function(settings) {
		// ------------------------------------------------------------------------
		// PLUGIN SETTINGS
		// ------------------------------------------------------------------------

        var self = this;

		var config = {
            template_body: '<ul></ul>',
            template_item: '<li>${text}</li>',
            list_id: 'autocomplete'+(new Date()).getTime(),

            selector_list: null,                        // query or function(this:editableField, config)
            selector_body: null,
            selector_item: '>li',
            
            async: false,
            source: null,                               // Default list of data or function
            
            items_count: 10,                            // Count items is visible
            live: false,                                // Connect events as live $.live or $.bind
            timeout: 0,                                 // Timeout before load data
            
            /**
             * Get/set value
             */
            getItemValue: function(item, config) {
                return $(item).text();
            },
            getValue: function(item, config) {
                return $(this).is('input') || $(this).is('textarea') ? $(this).val() : $(this).text();
            },
            setValue: function(item, text, config) {
                if ($(this).is('input') || $(this).is('textarea'))
                    $(this).val(text);
                else
                    $(this).text(text);
            },
            
            // Events
            onclick: null,                              // function(this:editableField, list, config)
            onchange: null,                             // function(this:editableField, list, config)
            onchange_after: null,                       // function(this:editableField, list, config)
            oncreate: null,                             // function(this:editableField, data, text, config)
            ontest: null,                               // function(this:editableField, text, item, config)
            onappend: null,                             // function(this:editableField, body, item, itemCode, config)
            onshow: null                                // function(this:editableField, show, list, config)
		};

		if (settings) {
			$.extend(config, settings);
		}
        
        var currentItem = null;
        var timer = null;
        
        // ------------------------------------------------------------------------
        // METHODS
        // ------------------------------------------------------------------------
        
        /**
         * Get data
         */
        var getData = function(text, cached, config, callBack) {
            if (cached)
                cached = jQuery.data(this, 'autocomplete_cache');
            if (cached && cached.length>0) {
                callBack.call(this, cached);
            }
            else {
                if (typeof(config.source)=='function' && config.async) {
                    var self = this;
                    config.source.call(this, text, function(data) {
                        jQuery.data(self, 'autocomplete_cache', data);
                        callBack.call(self, data);
                    });
                }
                else {
                    var data    = typeof(config.source) == 'function'
                                ? config.source.call(this, text)
                                : config.source;

                    jQuery.data(this, 'autocomplete_cache', data);
                    callBack.call(this, data);
                }
            }
        };
        
        /**
         * Get autocomplete list
         * @param item
         * @param config
         */
        var getList = function(item, config) {
            if (config.selector_list) {
                if (typeof(config.selector_list)=='function') {
                    return config.selector_list.call(item, config);
                }
                return $(config.selector_list);
            }
            return $('#'+config.list_id);
        };
        
        /**
         * Get autocomplete list body
         * @param item
         * @param config
         */
        var getBody = function(item, config) {
            var $body = null;
            if (typeof(config.selector_list)!='undefined') {
                if (typeof(config.selector_list)=='function')
                    $body = config.selector_list.call(item, config);
                else
                    $body = $(config.selector_list);
            }
            if (!$body || $body.length<1) {
                if (typeof(config.selector_body)!='undefined') {
                    if (typeof(config.selector_body)=='function')
                        $body = config.selector_body.call(item, config);
                    else
                        $body = $(config.selector_body);
                }
                if (!$body || $body.length<1)
                    $body = $('#'+config.list_id);
            }
            return $body;
        };
        
        /**
         * Get or create autocomplete list
         * @param item
         * @param config
         */
        var getOrCreateList = function(item, config) {
            var list = getList.call(this, item, config);
            if (!list || list.length<1) {
                if (typeof(config.template_body)=='function')
                    list = config.template_body.call(this, item, config);
                else
                    list = $(config.template_body);
                // Mark if no select
                if (!config.selector_list) {
                    list.attr('id', config.list_id).appendTo('body');
                    return $('#'+config.list_id);
                }
                list = getList.call(this, item, config);
            }
            return list;
        };
        
        /**
         * Show autocomplete list
         * @param show
         * @param data
         * @param text
         * @param config
         */
        var showList = function(show, list, config) {
            list = $(list || getList(this, config));
            
            if (false!==$(this).trigger('autocomplete_show', [show, list, config])) {
                if (show) {
                    var offset = $(this).offset();
                    list.css({'left': offset.left + 'px', 'top': (offset.top + $(this).outerHeight()) + 'px'});
                }
                if (typeof(config.onshow)=='function') {
                    if (false!==config.onshow.call(this, show, list, config)) {
                        if (show) list.css('display','block').show(); else list.hide();
                    }
                }
                else {
                    if (show) list.css('display','block').show(); else list.hide();
                }
            }
        };

        /**
         * Do change item
         * @param item
         * @param event
         * @param config
         */
        var doChange = function(item, event, config) {
            var $list = getList(this, config);
            
            if (false!==$(this).trigger('autocomplete_change', [item, $list, config])) {
                if (typeof(config.onchange)=='function') {
                    if (false!==config.onchange.call(this, item, config))
                        showList.call(this, false, $list, config);
                }
                else {
                    config.setValue.call(this, item, config.getItemValue.call(this, item, config), config);
                    showList.call(this, false, $list, config);
                }
            }
            if (false!==$(this).trigger('autocomplete_afterchange', [item, $list, config])) {
                if (typeof(config.onchange_after)=='function') {
                    config.onchange_after.call(this, item, config);
                }
            }
        };

        /**
         * Test item for show
         * @param text
         * @param item
         * @prama config
         */
        var doTest = function(text, item, config) {
            if (false===$(this).trigger('autocomplete_test', [text, item, config]))
                return false;
        
            if (typeof(config.ontest)=='function')
                return config.ontest.call(this, text, item, config);

            var regExp = new RegExp(text, 'ig');
            var cnt = typeof(item)=='string'
                    ? item
                    : ( typeof(item.text)=='undefined'
                        ? item.title
                        : item.text
                    );
            return regExp.test(cnt);
        };

        /**
         * Append item to list
         * @param body list
         * @param item
         * @param config
         */
        var doAppend = function(body, item, config) {
            var itemCode = config.template_item;
            if (typeof(itemCode)=='function') {
               itemCode = itemCode.call(this, body, item, config);
            }
            else {
                if (typeof(item)=='string') {
                    itemCode = itemCode.replace('${text}', item);
                }
                else {
                    for (var k in item)
                        itemCode = itemCode.split('${'+k+'}').join(item[k]);
                }
            }
            if (typeof(config.onappend)=='function') {
                if (false!==config.onappend.call(this, body, item, itemCode, config))
                    body.append(itemCode);
            }
            else {
                body.append(itemCode);
            }
        };

        // ------------------------------------------------------------------------
        // CONNECTING
        // ------------------------------------------------------------------------
        
        var construct = function(data, text, config) {
            if (!data || false===$(this).trigger('autocomplete_create',[data, text, config]))
                return;

            if (typeof(config.oncreate)=='function' && false===config.oncreate.call(this, data, text, config))
                return;

            var show = getList(this, config).css('display')=='none';
            var $list = getOrCreateList(this, config);
            
            var addet = 0;
            var $body = getBody(this, config).html('');
            for (var i=0;i<data.length && config.items_count>addet;i++) {
                if (doTest.call(this, text, data[i], config)) {
                    doAppend.call(this, $body, data[i], config);
                    addet++;
                }
            }
            if (addet>0) {
                // Accept events to selector
                if (config.selector_list && config.selector_item) {
                    $list.find(config.selector_item).unbind().bind('click',
                        function(event){clickEvent.call(currentItem, this, event, config);return false;});
                }
            }
            showList.call(this, addet>0, $list, config);
        };

        /// KEY UP EVENT
        var keyupEvent = function(event) {
            currentItem = this;
            var self = this;
            if (!config.source) return;
            
            var tm = function(event) {
                var $this = $(this);
                var text = config.getValue.call(this, $this, config);
                if (!text) return;
                text = text.trim();

                // Save old query
                jQuery.data(this, 'autocomplete_query', text);
                getData.call(this, text, false, config, function(data) {
                    construct.call(this, data, text, config);
                });
            };
            if (config.timeout>10) {
                if (timer) clearTimeout(timer);
                timer = setTimeout(function(){ tm.call(self, event); }, config.timeout);
            }
            else {
                tm.call(self, event);
            }
        };
        
        /// BLUR EVENT
        var blurEvent = function(event) {
            var self = this;
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            setTimeout(function(){
                showList.call(self, false, getList(self, config), config);
            }, 333);
        };
        
        /// FOCUS EVENT
        var focusEvent = function(event) {
            currentItem = this;
            if (!config.source) return;

            var query = jQuery.data(this, 'autocomplete_query');
            if (!query) return;
            
            getData.call(this, query, true, config, function(data) {
                construct.call(this, data, query, config);
            });
        };
        
        var events = {
            'keyup': keyupEvent,
            'blur':  blurEvent,
            'focus': focusEvent
        };
        
        /// CLICK ITEM
        var clickEvent = function(item, event, config) {
            if (false!==$(this).trigger('autocomplete_click',[item, config]))
                if (typeof(config.onclick)!='function' || false!==config.onclick.call(this, item, config))
                    doChange.call(this, item, event, config);
        };

        if (config.live) {
            $(this).die().live(events);
        }
        else {
            $(this).unbind().bind(events);
        }

        if (config.list_id && !config.selector_list) {
            $('#'+config.list_id+' '+config.selector_item).die().live('click',
                function(event){clickEvent.call(currentItem, this, event, config);return false;});
        }

		return this;
	};
})(jQuery);