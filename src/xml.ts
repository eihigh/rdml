/// <reference path="rdml.ts" />

namespace rdml.xml {

  // API
  export function parseString(s: string): Node[] {
    const p = new Parser(s);
    return p.parse();
  }

  // Internal

  // XML data structure
  export class Element {
    name: string = "";
    attrs: Attrs = {};
    childNodes: Node[] = [];

    get children(): Element[] {
      return this.childNodes.filter<Element>((x): x is Element => typeof x !== "string");
    }

    get data(): string {
      let s = "";
      for (const n of this.childNodes) {
        if (typeof n === "string") {
          s += n;
        }
      }
      return s;
    }
  }

  export type Node = Element | string;

  export type Attrs = { [attr: string]: string };

  // Parser
  const sp = " ";
  const spCc = sp.charCodeAt(0);
  const lt = "<";
  const ltCc = lt.charCodeAt(0);
  const gt = ">";
  const gtCc = gt.charCodeAt(0);
  const cr = "\r";
  const crCc = cr.charCodeAt(0);
  const lf = "\n";
  const lfCc = lf.charCodeAt(0);
  const minus = "-";
  const minusCc = minus.charCodeAt(0);
  const slash = "/";
  const slashCc = slash.charCodeAt(0);
  const excl = "!";
  const exclCc = excl.charCodeAt(0);
  const equal = "=";
  const equalCc = equal.charCodeAt(0);
  const singleQt = "'";
  const singleQtCc = singleQt.charCodeAt(0);
  const doubleQt = '"';
  const doubleQtCc = doubleQt.charCodeAt(0);
  const nameSpacers = "\n\r\t>/= ";
  const whiteSpaces = "\n\r\t ";
  const eof = 0;

  class Parser {

    pos: number = 0;
    errors: ParseError[] = [];

    constructor(private s: string) { }

    parse(): Node[] {
      const c = this.parseNodes("");
      if (!this.isOk) {
        throw new ParserError(this.errors);
      }
      return c;
    }

    // parsing a list of node
    parseNodes(parentName: string): Node[] {
      let nodes: Node[] = [];
      const start = this.pos;

      let textFrom = this.pos;
      while (!this.isEOF) {

        const textTo = this.pos; // just before the tag

        // a tag found
        if (this.curCc === ltCc) {
          this.pos++;

          this.skipSp();
          switch (this.curCc) {
            case eof:
              break;

            // ! is always comment. doctype is ignored.
            case exclCc:
              const text = this.slice(textFrom);
              if (text !== "") {
                nodes.push(text);
              }
              this.seekTo(gt);
              this.pos++;
              textFrom = this.pos;
              break;

            case slashCc: // end tag
              this.pos++;
              const name = this.parseName();

              if (name !== "" && name === parentName) {
                if (parentName === "script") {
                  // dispose child nodes.
                  const script = this.s.slice(start, textTo);
                  nodes = [script];
                }
                const text = this.s.slice(textFrom, textTo);
                if (text !== "") {
                  nodes.push(text);
                }
                this.pos++;
                return nodes;
              }
              break;

            default: // start tag
              const element = this.parseElement();
              if (element !== null) { // parsing success
                const text = this.s.slice(textFrom, textTo);
                if (text !== "") {
                  nodes.push(text);
                }
                nodes.push(element);
                textFrom = this.pos; // next
              }
              break;
          }

        } else {
          this.pos++;
        }
      }

      // expected closing tag, found EOF
      if (parentName !== "") {
        this.pushError(`closing tag </${parentName}> not found`);
        return nodes;
      }

      const text = this.slice(textFrom);
      if (text !== "") {
        nodes.push(text);
      }
      return nodes;

    }

    parseComment() {
      this.seekTo(gt);
      if (this.isEOF) {
        this.pushError(`unclosed comment`);
      }
      return;
    }

    parseText() {
      const start = this.pos;
      this.seekTo(lt);
      return this.slice(start);
    }

    parseScript() {
      const start = this.pos;
      this.pos = this.s.indexOf("</script>", this.pos);
      return this.slice(start);
    }

    parseElement() {
      let el = new Element();

      // get element's name
      el.name = this.parseName();
      if (el.name === "") {
        this.pushError(`element name not found`);
      }
      this.skipSp();

      if (this.isEOF) {
        this.pushError(`found EOF without closing`);
        return el;
      }

      // tag closed with no attributes
      switch (this.curCc) {
        case gtCc:
          this.pos++;
          el.childNodes = this.parseNodes(el.name);
          return el;

        case slashCc:
          this.seekTo(gt);
          this.pos++;
          return el;
      }

      if (!this.isOk) {
        return el;
      }

      // get attributes
      while (!this.isEOF) {

        // get attribute's name
        const attr = this.parseName();
        if (attr === "") {
          this.pushError(`syntax error`);
        }
        this.skipSp();

        // the attribute must be followed by =
        if (this.curCc !== equalCc) {
          this.pushError(`attribute '${attr}' must be followed by '='`);
        }
        this.skipSp();

        // the value must be wrapped by quotations
        if (this.curCc !== singleQtCc && this.curCc !== doubleQtCc) {
          this.pushError(`attribute's value must be wrapped by ' or "`);

        } else {
          const qt = this.curCh;
          this.pos++;
          const start = this.pos;
          this.seekTo(qt);
          const value = this.slice(start);
          this.pos++;

          if (this.isOk) {
            el.attrs[attr] = value;
          }
        }

        this.skipSp();

        // end of tag
        switch (this.curCc) {
          case gtCc: // closing
            this.pos++;
            el.childNodes = this.parseNodes(el.name);
            return el;

          case slashCc: // empty tag
            this.seekTo(gt);
            this.pos++;
            return el;
        }
      }

      // throw error if reaches EOF without closing the element

      return el;
    }

    // parse some name
    parseName() {
      const start = this.pos;
      while (nameSpacers.indexOf(this.curCh) === -1 && !this.isEOF) {
        this.pos++;
      }
      return this.slice(start);
    }

    // helper methods
    get curCh() {
      return this.s[this.pos];
    }

    get curCc() {
      return this.s.charCodeAt(this.pos);
    }

    get isEOF() {
      return this.curCh === undefined;
    }

    get isOk() {
      return this.errors.length === 0;
    }

    slice(start: number) {
      return this.s.slice(start, this.pos);
    }

    seekTo(ch: string) {
      this.pos = this.s.indexOf(ch, this.pos);
      if (this.pos === -1) {
        this.pushError(`next '${ch}' not found`);
        this.pos = this.s.length;
        return false;
      }
      return true;
    }

    skipSp() {
      while (this.curCh === sp && !this.isEOF) {
        this.pos++;
      }
    }

    pushError(message: string) {
      this.errors.push(new ParseError(message));
    }
  }

  class AttrError implements Error {
    public name = "AttributeError";
    public message = "";
  }

  class ParseError implements Error {
    public name = "XmlParseError";
    constructor(public message: string) { }
  }

  class ParserError implements Error {
    public name = "XmlParserError"
    public message: string;

    constructor(errors: ParseError[]) {
      this.message = `${errors.length} error(s) thrown.`;
      errors.map(e => {
        this.message += "<br>\r\n" + e.message;
      });
    }
  }
}

const str = `
<p><q>lorem ipsum</q></p>
`

const expect = [
  "\n",
  {
    name: "p",
    __attrs: {},
    childNodes: [
      {
        name: "q",
        __attrs: {},
        childNodes: ["lorem ipsum"]
      }
    ]
  },
  "\n",
]


console.time('parse');
const nodes = rdml.xml.parseString(str);
console.timeEnd('parse');
console.log(JSON.stringify(nodes));
