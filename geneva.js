/**  
 *  GenevaJS (c) 2009 Rick waldron
 *
 *  MIT license.
 *
 *  THIS VERSION OF GENEVA IS FOR DEVELOPMENT ONLY
 *  DO NOT USE IN PRODUCTION ENVIRONMENTS -- INCOMPLETE!!
 *--------------------------------------------------------------------------
*/
// NOT PART OF GENEVA CORE -- TEMPORARY
String.prototype.trim = function() {
  return this.replace( /^\s+|\s+$/g, '' );
};
String.prototype.clean = function() {
  return this.replace(/\t/g, '').replace(/\s+/g, ' ');
};
String.prototype.lcase = function() {
  return this.toLowerCase() ;
};

// END -- NOT PART OF GENEVA CORE -- TEMPORARY

//  $ stored as _$, used in the window.$ adapter
(function ( _$ ) {
  
  //  Prototype class/objects to copy
  var _classobjects   = [ Element.Methods, Form.Methods, Form.Element.Methods ]; //?    

  //  Geneva class object with Enumerable mixin 
  //**  (previous builds attempted to extend objects, mixin works best)
  var Geneva = Class.create( Enumerable, {
    initialize: function ( selector ) {
      //  Set up
      this._elements = Object.isString(selector) 
                      ?  $$(selector) 
                      : [_$(selector)];
      
      // Try _$
      if ( this._elements.length < 1 )
        this._elements = [_$(selector)];
      
      // Store elements in array
      this._toArray();
    }
  });
  
  
  // GenevaJS private parts
  Geneva.addMethods( {
    _toArray: function() {
      Array.prototype.push.apply(this, this._elements);
    },
    // usage: this._first() to substitute element
    _first: function() {
      return this._elements[0];
    },
    _each: function(iteratorFn) {
      for (var i = 0, length = this.length; i < length; i++)
        iteratorFn(this[i]);
    },
    _style : function ( args ) {
      if ( typeof args === 'object' ) 
        this.setStyle( args );
      else
        this.addClassName( args );
    }
  });

  Geneva.fn = {};
  Geneva.fn._copySourceMethods  = function () {
    
    _classobjects.each( function ( source ) {
      
      for ( var method in source ) {
        //  console.log(method);
        //  console.log( source[method] );


        //  Define Geneva compat copies of all methods. 
        //  with first _element argument support
        Geneva.prototype[ method ] = ( function ( method ) {
          
          //console.log( source[ method ].argumentNames() )  ;
          return function() { 

            var args = $A( arguments ), _first = false, _result, _elements = [];

            this._elements.each( function( element, i )  {

              // ex. observe(  [element, event, callback] )
              _result = source[ method ].apply( null, args.length ? [ element ].concat(args) : [ element ] );

              if ( !Object.isElement( _result ) || Object.isUndefined( _result ) ) {
                //  console.log(_result);
                //  console.log('_first set true');
                _first = true; throw $break;
              }

              _result && ( _elements[i] = element );
            });

            if ( _first ) return _result;

            this._elements = _elements;
            return this;
          }

        //  pass the object method as argument to the closure  
        })( method );
        //  End Geneva.prototype definition
      };
    });
  }

  Geneva.fn._copySourceMethods();
  
  //  Events
  $w(
  'composition compositionstart compositionend contextmenu ' + 
  //  Drag
  'dragenter dragover dragexit dragdrop draggesture ' +
  //  Form
  'focus blur submit reset change select input ' +
  //  Keys
  'keydown keyup keypress ' +
  //  Doc
  'load beforeunload unload abort error ' +
  //  Mouse
  'mousedown mouseup click dblclick mouseover mouseout mousemove ' +
  //  Etc.
  'paint resize scroll overflow underflow overflowchanged text '
  )
  .each( function( type ) {
  
    Geneva.prototype[ type ] = ( function( type ) {
      
      return function( fn ) {
        
        if ( arguments.length === 2 )
          this._style(arguments[1]);
          
        if ( fn === undefined ) {
          try {
            this._first()[ type ]();
          } catch (e) {} 

          return this;
        }
        
        return this.observe( type, function ( evt ) {
          fn.call( this, evt );
        });        
      }
    })( type );
  });
  
  //  $g Convenience
  this.$g = function(selector) {
    return new Geneva(selector);
  };

  //  $g Extender
  this.$g.addMethods = function( source ) {
    for ( var method in source )
      Geneva.prototype[ method ] = source[ method ];
  };
  
  //  $F() Adapter
  window.$F = function () {
    return _$( arguments[0] ).getValue();
  };
  
  //  $ as _$ Adapter
  window._$ = function () {
    return new _$( arguments[0] );
  };

  //  $() Adapter. RegEx patterns from jQuery
  window.$ = function() {
      
    if ( arguments.length === 0 )
      return new Geneva(document.body);

    selector = arguments[0];
    
    if ( typeof selector === 'object' ) {
      if ( Object.isElement( selector ) && Object.isString( selector ) )
        return new Geneva( selector );

      return selector;
    }

    // jQuery selector support. 
    var _strExpr = /^[^<]*(<(.|\s)+>)[^>]*$|^#([\w-]+)$/, // jQuery (c) John Resig
        _selExpr = /^.[^:#\[\.,]*$/,                      // jQuery (c) John Resig
        _selArr  = _strExpr.exec( selector );

    if ( _selArr && _selArr[3] ) {
      return new Geneva( _selArr[3] );
    } else {
      var _selArr   = _selExpr.exec( selector );

      if ( _selArr &&  _$( _selArr[0] ) ) 
        return new Geneva( _selArr[0] );

      return new Geneva( selector );
    }

    return new _$( selector );
  };
  
  
  //  Redefine Element.addMethods
  //  Any later defined additions will 
  //  be made compatible with Geneva
  Element.addMethods = ( function( source ) {
    var method = function() {
      source.apply( source, arguments );
      Geneva.fn._copySourceMethods();
    };
    return method;
  })( Element.addMethods );
  
  Element.addMethods();
  
//  $ as _$ within Geneva
})( $ ); 


//  serialize() adapter
Form.Element.Methods.serialize = function() {
  el = _$( arguments[0] );
  if ( !el.disabled && el.name )
    return el.serialize();
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

  ajax   : function ( url, method, args, fn, type ) {
    
    
    
    if ( typeof args === 'function' )
      type = fn, fn  = args, args  = null;
    
    var options = {
          method: method,
          onComplete: function (xhr) {
            
            type  = type === '' || typeof type === undefined ? 'text' : type;
            pass  = type === 'text' 
                    ? xhr.responseText 
                    : ( type.lcase() === 'json' 
                        ? xhr.responseText.evalJSON() 
                        : ( type.lcase() === 'script'
                            ? xhr.reponseText.evalScripts()
                            : xhr.responseXML ) );  
            
            return fn.call( this, pass );
          }
        };
        
    if ( args !== null )
      options[( method === 'get' ) ? 'parameters' : 'postBody'] = args;
    
    
    new Ajax.Request( url, options );
    

    return this;  
  },
  get:  function( url, args, fn, type ) {
    
  //    console.log(this);
    
    return this.ajax(url, 'get', args, fn, type);
  },
  post:  function( url, args, fn, type ) {
    return this.ajax(url, 'post', args, fn, type);
  },
  getScript: function( url, fn ) {
    return this.get(url, null, fn, "script");
  },
  getJSON: function( url, args, fn ) {
    return this.get(url, args, fn, "json");
  },
  load: function ( url, args, fn ) {
    var that  = this;

    if ( typeof args === 'function' )
      fn  = args, args  = null;

    function completedFn(xhr) {
      if ( that ) {
        that._elements.each(  function ( elem ) {
          if ( elem.tagName !== 'BODY' ) {
            if ( fn === undefined )
              elem.update(xhr.responseText);
            else {
              elem.update( fn.call(elem, xhr) );
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
    
    new Ajax.Request( url, options );
    
    return this;  
  }
});









//  Attributes : val, html
Element.addMethods({
  val  : function ( el,  arg ) {
    elem  = $(elem);
    if ( arg !== undefined ) {
      return elem.update(function ( arg ) {
        return typeof arg === 'function' ? arg() : arg ;
      });
    }
    
    return ( elem.value ).trim();
  },
  html  : function ( elem,  arg ) {
    elem  = $(elem);
    if ( arg !== undefined )
      return elem.update( arg );
    else 
      return ( elem.innerHTML ).clean().trim();
  },
  text  : function ( elem, arg ) {
    elem  = $(elem);

    if ( arg !== undefined ) {
      return elem.update(function ( arg ) {
        return typeof arg === 'function' ? arg() : arg ;
      });
    } 
    return  elem.innerHTML.stripTags().clean().trim();
  }  
});

//  Attributes : attr, removeAttr, [ add, has, remove, toggle ]Class, 
Element.addMethods({
  
  attr        : function  ( elem, prop, arg ) {
    elem  = $(elem);

    if ( typeof prop === 'string' && arg === undefined )
      return elem.readAttribute( prop );
  
    if ( typeof prop === 'object'  ) {
      for ( var key in prop  )
        elem.writeAttribute( key, prop[ key ] );
     
      return elem;
    }
    return elem.writeAttribute( prop, ( typeof arg === 'function' ? arg() : arg ) );
  }, 
  removeAttr  : function  ( elem, prop ) {
    elem  = $(elem);
    
    return ( prop !== undefined 
              ? elem.removeAttribute( prop )
              : elem );
  },
  addClass    : function  ( elem, arg ) {
    return $(elem).addClassName ( arg );
  },
  hasClass    : function  ( elem, arg ) {
    return $(elem).hasClassName ( arg )
  },
  removeClass : function  ( elem, arg ) {
    return $(elem).removeClassName ( arg );
  },
  toggleClass : function  ( elem, arg ) {
    elem  = $(elem);
    
    if ( elem.hasClassName( arg ) ) 
      return elem.removeClassName ( arg );
    else
      return elem.addClassName ( arg );
  }
});

// CSS
Element.addMethods({
  
  // this is cheating. but is only temporary
  css: function ( elem, arg ) {
    elem = $(elem)
    
    if ( typeof arg === 'object' )
      return elem.setStyle( arg );

    return elem.getStyle( arg );            
  }
});



//  Traversing
//  Convenience Aliases to Prototype methods
Element.addMethods({
  
  children: Element.Methods.immediateDescendants,
  
  closest:  function (elem) {
    return $(elem).parentNode;
  },
  contents: function (elem) {
    return $(elem).select("*");
  },
  
  // find : function () {},
  // next : function () {},
  
  nextAll: function (elem) {
    return $(elem).recursivelyCollect('nextSibling');
  },
  offsetParent: function (elem) {
    return $(elem).getOffsetParent();
  },
  parent: function (elem) {
    return $(elem).parentNode;
  },
  parents: function ( elem ) {
    return $(elem).recursivelyCollect('parentNode');
  },
  prev: function ( elem, exp, index ) {
    return $(elem).previous(exp, index);          
  },
  prevAll : function ( elem ) {
    return $(elem).recursivelyCollect('previousSibling');
  }
});


// TODO:
// Manipulation

Element.addMethods();