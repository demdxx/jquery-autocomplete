jquery-autocomplete
===================

jQuery autocomplete extension.

##jQuery Events
 
    autocomplete_click          => event, item:htmlElement, config
    autocomplete_change         => event, item:htmlElement, list:jQObject, config
    autocomplete_afterchange    => event, item:htmlElement, list:jQObject, config
    autocomplete_test           => event, text, item:struct, config
    autocomplete_create         => event, data, text, config
    autocomplete_show           => event, show:bool, list:jQObject, config

##Example
 
```html
  <div class="search">
      <input type="text" />
      <div class="selector" style="display"><ul><li>There will be uploaded to the elements...</li></ul></div>
  </div>
```
    
```js
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
```

Copyright
=========

    @copyright Dmitry Ponomarev <demdxx@gmail.com>
    @year 2012
    @license MIT