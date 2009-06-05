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
    _siz  = Sizzle(_s);
    
    if ( _siz.length > 0 )
      return _siz;

    return $$(_s);
  };
  
  
  //  Class/objects to copy
  var _classobjects   = [ Element.Methods, Form.Methods, Form.Element.Methods ]; //?    
  
  //  GenevaJS object [Enumerable]
  var Geneva = Class.create( Enumerable, {
    initialize: function ( _s ) {
      //  Set up
      //  If sizzle.js loaded, add to the selector arsenal
      this._elems = Object.isString(_s) 
                      ? ( 'Sizzle' in window ? $S(_s) : $$(_s) )
                      : [_$(_s)];
      
      // Try _$
      if ( this._elems.length < 1 )
        this._elems = [_$(_s)];
      
      this._toArray();
    }
  });
  
  // GenevaJS private parts
  Geneva.addMethods( {
    _toArray: function() {
      Array.prototype.push.apply(this, this._elems);
    },
    // usage: this._first() to substitute element
    _first: function() {
      return this._elems[0];
    },
    _each: function(iterFn) {
      this._elems._each(iterFn);

      //for (var i = 0, length = this.length; i < length; i++)
      //  iterFn(this[i]);
    },
    _style : function (args) {
      if ( typeof args === 'object' ) 
        this.setStyle(args);
      
      this.addClassName(args);
    }
  });

  Geneva.fn = {};
  Geneva.fn._adapter = function() {

    if ( arguments.length === 0 )
      return new Geneva(document.body);

    var _s = arguments[0];

    
    if ( typeof _s === 'function' ) {
      //  check dom loaded, if it has, fire function now, if not, listen for dom:loaded, then fire
      console.log(  _s.call(this, arguments)  );
      return document;
    }

    if ( typeof _s === 'object' ) {
      if ( Object.isElement(_s) && Object.isString(_s) )
        return new Geneva(_s);

      return _s;
    }

    // jQuery selector support. 
    var _strExp = /^[^<]*(<(.|\s)+>)[^>]*$|^#([\w-]+)$/, // jQuery (c) John Resig
        _selExp = /^.[^:#\[\.,]*$/,                      // jQuery (c) John Resig
        _selArr = _strExp.exec(_s);


    // Create new element
    if ( _selArr && _selArr[1] && !_selArr[3] ) {
      
      var _newArr = /^<(\w+)\s*\/?>$/.exec(_selArr[1]);
      
      if ( _newArr )
        return new Geneva( document.createElement( _newArr[1] ) );
    }
    
    if ( _selArr && _selArr[3] ) {

      return new Geneva(_selArr[3]);

    } else {
      var _selArr   = _selExp.exec(_s);

      if ( _selArr &&  _$(_selArr[0]) ) 
        return new Geneva(_selArr[0]);

      return new Geneva(_s);
    }

    return new _$(_s);
  };
  
  Geneva.fn._extend = function( source ) {
    for ( var method in source )
      Geneva.prototype[ method ] = source[ method ];
  };
  
  
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

            //var args = $A( arguments ), _first = false, _result, _elems = [];
            var _args = $A( arguments ), _first = false, _result, _elems = [];

            this._elems.each( function( element, i )  {

              // ex. observe(  [element, event, callback] )
              _result = source[ method ].apply( null, _args.length ? [ element ].concat(_args) : [ element ] );

              if ( !Object.isElement( _result ) || Object.isUndefined( _result ) ) {
                //  console.log(_result);
                //  console.log('_first set true');
                _first = true; throw $break;
              }

              _result && ( _elems[i] = element );
            });

            if ( _first ) return _result;

            this._elems = _elems;
            return this;
          }

        //  pass the object method as argument to the closure  
        })( method );
        //  End Geneva.prototype definition
      };
    });
  };

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
        
        //  Cursor controller [OMIT?]
        /*
        if ( type === ('click' || 'dblclick') )
          this._style({ cursor: 'default' });
        if ( type === 'submit' )
          this._first().setAttribute('onsubmit', 'return false');
        */
        //  No callback, use native
        if ( typeof fn === undefined ) {
          try {
            //this._each();
            this._first()[ type ]();
          } catch (e) {} 
          return this._first();
        }
        
        var fn  = fn;
        
        //console.log(this);
        //return this.observe( type, fn);
        return this.observe( type, function (_e) {
          fn.call( this, _e );
        }.bind());        
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
  
  
  //  $g Convenience
  window.$g = Geneva;
  
  //  $g Extender
  window.$g.addMethods = Geneva.fn._extend;
  
  //  $F() Adapter
  window.$F = function () {
    return _$( arguments[0] ).getValue();
  };
  
  //  $ as _$ Copy
  window._$ = function () {
    return new _$( arguments[0] );
  };

  //  $() Adapter
  window.$  = Geneva.fn._adapter; 
  
  //document.$  = $;
  
  Element.addMethods();
//  $ as _$
})( $ ); 

//  update() Adapter
Element.addMethods({
  _update: function (elem, arg) {
    return $(elem).update( typeof arg === 'function' ? arg() : arg );
  }
});


console.log($g);
console.log($);



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
    
    return ( elem.value )._gtrim();
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
    
    if ( typeof prop === 'string' && arg === undefined )
      return elem.readAttribute( prop );
  
    if ( typeof prop === 'object'  ) {
      for ( var key in prop  )
        elem.writeAttribute( key, prop[ key ] );
     
      return elem;
    }
    return elem.writeAttribute( prop, ( typeof arg === 'function' ? arg() : arg ) );
  }, 
  removeAttr:   function  (elem, prop ) {
    elem  = $(elem);
    
    return ( prop !== undefined 
              ? elem.removeAttribute( prop )
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
    
    if (elem.hasClassName(arg) ) 
      return elem.removeClassName(arg);
    
    return elem.addClassName(arg);
  }
});

// CSS
Element.addMethods({
  
  css: function (elem, arg) {
    elem = $(elem)
    
    if ( typeof arg === 'object' )
      return elem.setStyle(arg);

    return elem.getStyle(arg);            
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
  
  offsetParent: Element.Methods.getOffsetParent,
  
  parent:   function (elem) {
    return $(elem).parentNode;
  },
  parents:  function (elem) {
    return $(elem).recursivelyCollect('parentNode');
  },
  prev:     function (elem, exp, index ) {
    return $(elem).previous(exp, index);          
  },
  prevAll : function (elem) {
    return $(elem).recursivelyCollect('previousSibling');
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