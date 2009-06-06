/**  
 *  GenevaJS (c) 2009 Rick waldron
 *
 *  MIT license.
 *
 *  THIS VERSION OF GENEVA IS FOR DEVELOPMENT ONLY
 *  DO NOT USE IN PRODUCTION ENVIRONMENTS -- INCOMPLETE!!
 *--------------------------------------------------------------------------
*/
// GenevaJS voodoo
String.prototype._gtrim   = function() { return this.replace( /^\s+|\s+$/g, '' ); };
String.prototype._gclean  = function() { return this.replace(/\t/g, '').replace(/\s+/g, ' '); };
String.prototype._glcase  = function() { return this.toLowerCase(); };
// END

//  $ as _$ adapter
(function (_$) {
  
  
  function $S(_s) {
    var _siz  = Sizzle(_s);
    
    if ( _siz.length > 0 )
      return _siz;

    return $$(_s);
  };
  
  //  Prototype objects to copy into GenevaJS
  var _copyset   = [ Element.Methods, Form.Methods, Form.Element.Methods ];
  
  //  GenevaJS Object 
  //  [mixes: Enumerable (allows array-like object support)]
  var Geneva = Class.create( Enumerable, {
    initialize: function ( _s ) {
      //  Sizzle || $$() || _$()
      this._elems = Object.isString(_s) 
                      ? ( 'Sizzle' in window ? $S(_s) : $$(_s) )
                      : [_$(_s)];
      
      //  Covers single elements
      if ( this._elems.length < 1 )
        this._elems = [_$(_s)];
      
      this._toArray();
    },
    //  Internal  _toArray makes object this._elems array compat
    _toArray: function() {
      Array.prototype.push.apply(this, this._elems);
    },
    //  Internal this._first() clean alias to this._elems[0]
    _first: function() {
      return this._elems[0];
    },
    //  Internal _each()
    _each: function(iterFn) {
      this._elems._each(iterFn);
    }
  });

  Geneva.fn = {};
  Geneva.fn._adapter = function() {
    //  $() is empty SEE: Ajax Methods
    if ( arguments.length === 0 ) {
      return new Geneva(document.body);
    }      

    //  _s = selector = element = function = document
    var _s = arguments[0];

    //  $(function(){}) = dom:loaded = $.ready()
    if ( typeof _s == 'function' ) {
      return document.observe('dom:loaded', function () {
        _s.call(this, arguments);
      }.bind(this));
    }

    if ( typeof _s == 'object' ) {
      if ( Object.isElement(_s) && Object.isString(_s) )
        return new Geneva(_s);

      return _s;
    }
    //  Expressions jQuery (c) John Resig
    var _strExp = /^[^<]*(<(.|\s)+>)[^>]*$|^#([\w-]+)$/,
        _selExp = /^.[^:#\[\.,]*$/,                     
        _strArr = _strExp.exec(_s),
        _selArr = _selExp.exec(_s);
        
    //  New Element
    if ( _strArr && _strArr[1] && !_strArr[3] ) {
      var _newArr = /^<(\w+)\s*\/?>$/.exec(_strArr[1]);
      
      if ( _newArr )
        return new Geneva( document.createElement( _newArr[1] ) );
    }
    //  #Element
    if ( _strArr && _strArr[3] ) {
      return new Geneva(_strArr[3]);
    } 
    //  .ClassName  
    if ( _selArr &&  _$(_selArr[0]) ) {
      return new Geneva(_selArr[0]);
    }
    //  CSS Selector
    return new Geneva(_s);
    
    //  Prototype $()
    //*return new _$(_s);
  };
  
  Geneva.fn._extend = function( source ) {
    for ( var method in source )
      Geneva.prototype[ method ] = source[ method ];
  };
  
  
  Geneva.fn._copySourceMethods  = function () {
    
    _copyset.each( function ( source ) {
      
      for ( var method in source ) {
        //  Define Geneva compat copies of all methods. 
        Geneva.prototype[ method ] = ( function ( method ) {
          
          return function() { 

            var _elems = [], _args = $A( arguments ), _first = false, _result;

            this._elems.each( function( elem, i )  {
              
              //  _result: the single element is given the method
              //  console.log(method);
              //  console.log(_args.length ? [ elem ].concat(_args) : [ elem ]);
              _result = source[ method ].apply( null, _args.length ? [ elem ].concat(_args) : [ elem ] );
              
              //  Break if method has 
              if ( typeof _result == 'undefined' || _result.nodeType != 1 ) {
                 //console.log('---S:_copySourceMethods---');
                 //console.log(_result);
                 //console.log('_first set true');
                 //console.log('---E:_copySourceMethods---');
                  
                _first = true; throw $break;
                
                //console.log($break);
              }

              //  console.log(_result);
              //  console.log(_elems[i] = elem);
              _result && ( _elems[i] = elem );
            });

            if ( _first ) return _result;

            this._elems = _elems;
            return this;
          }

        //  method explicitly  
        })( method );
      };
    });
  };

  Geneva.fn._copySourceMethods();
  
  
  
  //  Events
  $w(
  'dragenter dragover dragexit dragdrop draggesture ' +
  'focus blur submit reset change select input ' +
  'keydown keyup keypress ' +
  'load beforeunload unload abort error paint resize scroll ' + 
  'mousedown mouseup click dblclick mouseover mouseout mousemove contextmenu'
  )
  .each( function( type ) {
  
    Geneva.prototype[ type ] = ( function( type ) {
      
      return function( fn ) {
        
        //  Callback undefined, use native
        if ( ( typeof fn == 'undefined' || arguments.length === 0 ) && this._elems.length > 0 ) {
          for( var i = 0, _elen = this._elems.length; i < _elen; i++ ) {
            this._elems[i][type](); 
          }
          return this;
        }
        //  fn != undefined
        var fn  = fn ? fn : function () {};

        //  Prototype's observe will ensure proper handling of events added to elements
        //  No need to pollute Geneva with event handling functions
        return this.observe( type, function (_e) {
          fn.call( this, _e );
        }.bind());
        //  For some bizarre reason, excluding .bind() causes errors in FF & IE 
      }
    })( type );
  });
  
  //  Element.addMethods Adapter
  Element.addMethods = ( function( source ) {
    var method = function() {
      source.apply( source, arguments );
      Geneva.fn._copySourceMethods();
    };
    return method;
  })( Element.addMethods );  

  //  $() Adapter
  window.$  = Geneva.fn._adapter; 
  //  $g Geneva alias
  window.$g = Geneva;
  //  $g Extender
  window.$g.addMethods = Geneva.fn._extend;
  //  $F() Adapter
  window.$F = function () {
    return _$( arguments[0] ).getValue();
  };
  //  _$ Prototype $
  window._$ = function () {
    return new _$( arguments[0] );
  };
  //  Element methods with Geneva compat  
  Element.addMethods();
//  $ as _$
})( $ ); 

//  update() Adapter
Element.addMethods({
  _update: function (elem, arg) {
    if ( elem.value ) {
      return $(elem).value = (function (arg) {
                                return (typeof arg == 'function' ? arg() : arg);
                              })(arg);
    }                      
    return $(elem).update( typeof arg == 'function' ? arg() : arg );
  }
});

//  serialize() Adapter
Form.Element.Methods.serialize = function() {
  elem = _$(arguments[0]);
  if ( !elem.disabled && elem.name )
    return elem.serialize();
  return '';
};

//  Interaction
$g.addMethods({
  hover   : function ( overFn, outFn ) {
    this.mouseover( overFn )
      .mouseout( outFn );
  }
});


//  Ajax
$g.addMethods({

  /*
  
  EXAMPLE JQUERY
  $.ajax({
      url: 'document.xml',
      type: 'GET',
      dataType: 'xml',
      timeout: 1000,
      error: function(){
          alert('Error loading XML document');
      },
      success: function(xml){
          // do something with xml
      }
  });
  */
  //  this is wrong - see example from jquery above
  
  ajax   : function (url, method, args, fn, type) {
    
    
    
    if ( typeof args === 'function' )
      var type = fn, fn  = args, args  = null;
    
    var options = {
          method: method,
          onComplete: function (xhr) {
            
            type  = type === '' || typeof type === undefined ? 'text' : type;
            pass  = type === 'text' 
                    ? xhr.responseText 
                    : ( type._glcase() === 'json' 
                        ? xhr.responseText.evalJSON() 
                        : ( type._glcase() === 'script'
                            ? xhr.reponseText.evalScripts()
                            : xhr.responseXML ) );  
            
            return fn.call( this, pass );
          }
        };
        
    if ( args !== null )
      options[( method === 'get' ) ? 'parameters' : 'postBody'] = args;
    
    
    new Ajax.Request(url, options );
    

    return this;  
  },
  
  get:        function(url, args, fn, type) {
    return this.ajax(url, 'get', args, fn, type);
  },
  post:       function(url, args, fn, type) {
    return this.ajax(url, 'post', args, fn, type);
  },
  getScript:  function(url, fn ) {
    return this.get(url, null, fn, "script");
  },
  getJSON:    function(url, args, fn) {
    return this.get(url, args, fn, "json");
  },
  load:       function(url, args, fn) {
    //  this sucks.
    var that  = this;

    if ( typeof args === 'function' )
      var fn  = args, args  = null;

    function completedFn(xhr) {
      if ( that ) {
        that._elems.each(  function (elem ) {
          if ( elem.tagName !== 'BODY' ) {
            if ( fn === undefined )
              elem.update(xhr.responseText);
            else {
              elem.update( fn.call(elem, xhr.responseText) );
            }
          }                       
        });
      }
    }
    
    var options = {
          method: 'get',
          onComplete: completedFn
       };
         
    if ( args !== undefined )
      options['parameters'] = args;
    
    new Ajax.Request(url, options );
    
    return this;  
  }
  
});

//  Attributes : val, html
Element.addMethods({
  val:    function (elem, arg) {
    elem  = $(elem);
    if ( arg !== undefined )
      return elem._update(arg);
    
    return (elem.value)._gtrim();
  },
  html:   function (elem, arg) {
    elem  = $(elem);
    if ( arg !== undefined )
      return elem._update(arg);
    
    return ( elem.innerHTML )._gclean()._gtrim();
  },
  text:   function (elem, arg) {
    elem  = $(elem);
    if ( arg !== undefined )
      return elem._update(arg);

    return  elem.innerHTML.stripTags()._gclean()._gtrim();
  }  
});

//  Attributes : attr, removeAttr, [ add, has, remove, toggle ]Class, 
Element.addMethods({

  attr:         function  (elem, prop, arg) {
    elem  = $(elem);
    if ( typeof prop == 'string' && typeof arg == 'undefined' ) {
      return elem.readAttribute(prop);
    }      
  
    if ( typeof prop == 'object'  ) {
      for ( var key in prop  )
        elem.writeAttribute( key, prop[ key ] );
     
      return elem;
    }
    return elem.writeAttribute( prop, ( typeof arg == 'function' ? arg() : arg ) );
  }, 
  removeAttr:   function  (elem, prop) {
    elem  = $(elem);
    
    return ( prop != 'undefined' 
              ? elem.removeAttribute(prop)
              : elem );
  },
  addClass:     function  (elem, arg) {
    return $(elem).addClassName(arg);
  },
  hasClass:     function  (elem, arg) {
    return $(elem).hasClassName(arg)
  },
  removeClass:  function  (elem, arg) {
    return $(elem).removeClassName(arg);
  },
  toggleClass:  function  (elem, arg) {
    elem  = $(elem);
    
    if (elem.hasClassName(arg) ) {
      return elem.removeClassName(arg);
    }      
    return elem.addClassName(arg);
  }
});

// CSS
Element.addMethods({
  
  css:      function (elem, arg) {
    elem =  $(elem)
    
    if ( typeof arg == 'object' )
      return elem.setStyle(arg);

    return elem.getStyle(arg);            
  }
  
  //  TODO:
  //  -------------
  //  offset
  //  position
  //  scrollTop/scrollTop(val)
  //  scrollLeft/scrollLeft(val)
  //  height/height(val)
  //  width/width(val)
  //  innerHeight
  //  innerWidth
  //  outerHeight
  //  outerWidth
});



//  Traversing
//  Convenience Aliases to Prototype methods
Element.addMethods({
  
  //  Filtering
  eq:       function (i) {
    //console.log(this);
  },
  filter:   function (arg) {
    // arg can be either expression or function
  },
  is:       function (exp) {
  },
  map:      function (fn) {
  },
  not:      function (exp) {
  },
  slice:    function (start, end) {
  },
  //  Finding
  children: Element.Methods.immediateDescendants,
  offsetParent: Element.Methods.getOffsetParent,

  add:      function (exp) {
  },
  closest:  function (elem) {
    return  $(elem).parentNode;
  },
  //contents: Element.Methods.select,
  contents: function (elem) {
    return  $(elem).select('*');
  },
  nextAll:  function (elem) {
    return  $(elem).recursivelyCollect('nextSibling');
  },
  parent:   function (elem) {
    return  $(elem).parentNode;
  },
  parents:  function (elem) {
    return  $(elem).recursivelyCollect('parentNode');
  },
  prev:     function (elem, exp, index ) {
    return  $(elem).previous(exp, index);          
  },
  prevAll:  function (elem) {
    return  $(elem).recursivelyCollect('previousSibling');
  },
  //  Chaining
  andSelf:  function () {
  },
  end:      function () {
  }
});

//  Manipulation
//  these are terribly limited and well... just plain terrible.
Element.addMethods({
  appendTo:   function (elem, context) {
    $(context).insert(elem);
    return elem;
  },
  append:     function () {
    var args = $A(arguments), elem = args.shift();
    for( var i = 0, alen = args.length; i<alen; i++ ) {
      elem.insert( args[i][0] );
    }
    return elem;
  },
  prependTo:  function (elem, context) {
    $(context).insert( { before : elem });
    return elem;
  },
  prepend:    function () {
    var args = $A(arguments), elem = args.shift();
    for( var i = 0, alen = args.length; i<alen; i++ ) {
      elem.insert( { before : args[i][0] } );
    }
    return elem;
  }
  //,
  //before: function () {
  //}, 
  //after:  function () {
  //}
  //,
  //before: Element._insertionTranslations.before,
  //after:  Element._insertionTranslations.after,
  //bottom: function (elem, arg) {
  //  return $(elem).insert(arg);
  //}
});




Element.addMethods();