/* esm.sh - esbuild bundle(espree@9.4.0/espree) es2022 production */
import*as T from"https://esm.sh/v94/acorn@8.8.0/es2022/acorn.js";import P from"https://esm.sh/v94/acorn@8.8.0/es2022/acorn.js";var a={Boolean:"Boolean",EOF:"<end>",Identifier:"Identifier",PrivateIdentifier:"PrivateIdentifier",Keyword:"Keyword",Null:"Null",Numeric:"Numeric",Punctuator:"Punctuator",String:"String",RegularExpression:"RegularExpression",Template:"Template",JSXIdentifier:"JSXIdentifier",JSXText:"JSXText"};function N(e,n){let s=e[0],t=e[e.length-1],r={type:a.Template,value:n.slice(s.start,t.end)};return s.loc&&(r.loc={start:s.loc.start,end:t.loc.end}),s.range&&(r.start=s.range[0],r.end=t.range[1],r.range=[r.start,r.end]),r}function h(e,n){this._acornTokTypes=e,this._tokens=[],this._curlyBrace=null,this._code=n}h.prototype={constructor:h,translate(e,n){let s=e.type,t=this._acornTokTypes;if(s===t.name)e.type=a.Identifier,e.value==="static"&&(e.type=a.Keyword),n.ecmaVersion>5&&(e.value==="yield"||e.value==="let")&&(e.type=a.Keyword);else if(s===t.privateId)e.type=a.PrivateIdentifier;else if(s===t.semi||s===t.comma||s===t.parenL||s===t.parenR||s===t.braceL||s===t.braceR||s===t.dot||s===t.bracketL||s===t.colon||s===t.question||s===t.bracketR||s===t.ellipsis||s===t.arrow||s===t.jsxTagStart||s===t.incDec||s===t.starstar||s===t.jsxTagEnd||s===t.prefix||s===t.questionDot||s.binop&&!s.keyword||s.isAssign)e.type=a.Punctuator,e.value=this._code.slice(e.start,e.end);else if(s===t.jsxName)e.type=a.JSXIdentifier;else if(s.label==="jsxText"||s===t.jsxAttrValueToken)e.type=a.JSXText;else if(s.keyword)s.keyword==="true"||s.keyword==="false"?e.type=a.Boolean:s.keyword==="null"?e.type=a.Null:e.type=a.Keyword;else if(s===t.num)e.type=a.Numeric,e.value=this._code.slice(e.start,e.end);else if(s===t.string)n.jsxAttrValueToken?(n.jsxAttrValueToken=!1,e.type=a.JSXText):e.type=a.String,e.value=this._code.slice(e.start,e.end);else if(s===t.regexp){e.type=a.RegularExpression;let r=e.value;e.regex={flags:r.flags,pattern:r.pattern},e.value=`/${r.pattern}/${r.flags}`}return e},onToken(e,n){let s=this,t=this._acornTokTypes,r=n.tokens,i=this._tokens;function o(){r.push(N(s._tokens,s._code)),s._tokens=[]}if(e.type===t.eof){this._curlyBrace&&r.push(this.translate(this._curlyBrace,n));return}if(e.type===t.backQuote){this._curlyBrace&&(r.push(this.translate(this._curlyBrace,n)),this._curlyBrace=null),i.push(e),i.length>1&&o();return}if(e.type===t.dollarBraceL){i.push(e),o();return}if(e.type===t.braceR){this._curlyBrace&&r.push(this.translate(this._curlyBrace,n)),this._curlyBrace=e;return}if(e.type===t.template||e.type===t.invalidTemplate){this._curlyBrace&&(i.push(this._curlyBrace),this._curlyBrace=null),i.push(e);return}this._curlyBrace&&(r.push(this.translate(this._curlyBrace,n)),this._curlyBrace=null),r.push(this.translate(e,n))}};var x=h;var m=[3,5,6,7,8,9,10,11,12,13,14];function d(){return m[m.length-1]}function w(){return[...m]}function k(e=5){let n=e==="latest"?d():e;if(typeof n!="number")throw new Error(`ecmaVersion must be a number or "latest". Received value of type ${typeof e} instead.`);if(n>=2015&&(n-=2009),!m.includes(n))throw new Error("Invalid ecmaVersion.");return n}function F(e="script"){if(e==="script"||e==="module")return e;if(e==="commonjs")return"script";throw new Error("Invalid sourceType.")}function v(e){let n=k(e.ecmaVersion),s=F(e.sourceType),t=e.range===!0,r=e.loc===!0;if(n!==3&&e.allowReserved)throw new Error("`allowReserved` is only supported when ecmaVersion is 3");if(typeof e.allowReserved<"u"&&typeof e.allowReserved!="boolean")throw new Error("`allowReserved`, when present, must be `true` or `false`");let i=n===3?e.allowReserved||"never":!1,o=e.ecmaFeatures||{},l=e.sourceType==="commonjs"||Boolean(o.globalReturn);if(s==="module"&&n<6)throw new Error("sourceType 'module' is not supported when ecmaVersion < 2015. Consider adding `{ ecmaVersion: 2015 }` to the parser options.");return Object.assign({},e,{ecmaVersion:n,sourceType:s,ranges:t,locations:r,allowReserved:i,allowReturnOutsideFunction:l})}var u=Symbol("espree's internal state"),y=Symbol("espree's esprimaFinishNode");function A(e,n,s,t,r,i,o){let l;e?l="Block":o.slice(s,s+2)==="#!"?l="Hashbang":l="Line";let c={type:l,value:n};return typeof s=="number"&&(c.start=s,c.end=t,c.range=[s,t]),typeof r=="object"&&(c.loc={start:r,end:i}),c}var g=()=>e=>{let n=Object.assign({},e.acorn.tokTypes);return e.acornJsx&&Object.assign(n,e.acornJsx.tokTypes),class extends e{constructor(t,r){(typeof t!="object"||t===null)&&(t={}),typeof r!="string"&&!(r instanceof String)&&(r=String(r));let i=t.sourceType,o=v(t),l=o.ecmaFeatures||{},c=o.tokens===!0?new x(n,r):null,f={originalSourceType:i||o.sourceType,tokens:c?[]:null,comments:o.comment===!0?[]:null,impliedStrict:l.impliedStrict===!0&&o.ecmaVersion>=5,ecmaVersion:o.ecmaVersion,jsxAttrValueToken:!1,lastToken:null,templateElements:[]};super({ecmaVersion:o.ecmaVersion,sourceType:o.sourceType,ranges:o.ranges,locations:o.locations,allowReserved:o.allowReserved,allowReturnOutsideFunction:o.allowReturnOutsideFunction,onToken:p=>{c&&c.onToken(p,f),p.type!==n.eof&&(f.lastToken=p)},onComment:(p,V,O,R,E,B)=>{if(f.comments){let I=A(p,V,O,R,E,B,r);f.comments.push(I)}}},r),this[u]=f}tokenize(){do this.next();while(this.type!==n.eof);this.next();let t=this[u],r=t.tokens;return t.comments&&(r.comments=t.comments),r}finishNode(...t){let r=super.finishNode(...t);return this[y](r)}finishNodeAt(...t){let r=super.finishNodeAt(...t);return this[y](r)}parse(){let t=this[u],r=super.parse();if(r.sourceType=t.originalSourceType,t.comments&&(r.comments=t.comments),t.tokens&&(r.tokens=t.tokens),r.body.length){let[i]=r.body;r.range&&(r.range[0]=i.range[0]),r.loc&&(r.loc.start=i.loc.start),r.start=i.start}return t.lastToken&&(r.range&&(r.range[1]=t.lastToken.range[1]),r.loc&&(r.loc.end=t.lastToken.loc.end),r.end=t.lastToken.end),this[u].templateElements.forEach(i=>{let l=i.tail?1:2;i.start+=-1,i.end+=l,i.range&&(i.range[0]+=-1,i.range[1]+=l),i.loc&&(i.loc.start.column+=-1,i.loc.end.column+=l)}),r}parseTopLevel(t){return this[u].impliedStrict&&(this.strict=!0),super.parseTopLevel(t)}raise(t,r){let i=e.acorn.getLineInfo(this.input,t),o=new SyntaxError(r);throw o.index=t,o.lineNumber=i.line,o.column=i.column+1,o}raiseRecoverable(t,r){this.raise(t,r)}unexpected(t){let r="Unexpected token";if(t!=null){if(this.pos=t,this.options.locations)for(;this.pos<this.lineStart;)this.lineStart=this.input.lastIndexOf(`
`,this.lineStart-2)+1,--this.curLine;this.nextToken()}this.end>this.start&&(r+=` ${this.input.slice(this.start,this.end)}`),this.raise(this.start,r)}jsx_readString(t){let r=super.jsx_readString(t);return this.type===n.string&&(this[u].jsxAttrValueToken=!0),r}[y](t){return t.type==="TemplateElement"&&this[u].templateElements.push(t),t.type.includes("Function")&&!t.generator&&(t.generator=!1),t}}};var J="9.4.0",_=J;import*as b from"../dependencies/eslint-visitor-keys/eslint-visitor-keys.cjs";var j={_regular:null,_jsx:null,get regular(){return this._regular===null&&(this._regular=T.Parser.extend(g())),this._regular},get jsx(){return this._jsx===null&&(this._jsx=T.Parser.extend(P(),g())),this._jsx},get(e){return Boolean(e&&e.ecmaFeatures&&e.ecmaFeatures.jsx)?this.jsx:this.regular}};function Q(e,n){let s=j.get(n);return(!n||n.tokens!==!0)&&(n=Object.assign({},n,{tokens:!0})),new s(n,e).tokenize()}function Y(e,n){let s=j.get(n);return new s(n,e).parse()}var G=_,S=function(){return b.KEYS}(),W=function(){let e,n={};typeof Object.create=="function"&&(n=Object.create(null));for(e in S)Object.hasOwnProperty.call(S,e)&&(n[e]=e);return typeof Object.freeze=="function"&&Object.freeze(n),n}(),Z=d(),ee=w();export{W as Syntax,S as VisitorKeys,Z as latestEcmaVersion,Y as parse,ee as supportedEcmaVersions,Q as tokenize,G as version};