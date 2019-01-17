/// <reference path="rdml.ts" />

namespace rdml.lexer {

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

  type stateFn = (() => stateFn) | null;

  enum itemType {
    eof = 0,
    lt,
    gt,
    tagName,
    attr,
    equal,
    value,
    slash,
    comment,
  };

  class Item {
    constructor(
      public typ: itemType,
      public start: number,
      public end: number
    ) { }
  }

  class Lexer {

    pos: number = 0;
    from: number = 0;
    width: number = 0;
    items: Item[] = [];

    constructor(public s: string) { }

    peek() {
      const c = this.s[this.pos].charCodeAt(0);
      // check surrogate pair
      this.width = (0xD800 <= c && c <= 0xDBFF) || (0xDC00 <= c && c <= 0xDFFF) ? 2 : 1;
      const ch = this.s.slice(this.pos, this.pos + this.width);
      return ch;
    }

    next() {
      const ch = this.peek();
      this.ensure();
      return ch;
    }

    ensure() {
      this.pos += this.width;
    }

    emit(typ: itemType) {
      this.items.push(new Item(typ, this.from, this.pos));
      this.from = this.pos;
    }

    run() {
      let state: stateFn = this.lexDocument;
      while (state !== null) {
        state = state();
      }
    }

    get isEOF() {
      return this.s[this.pos] === undefined;
    }

    lexDocument() {
      let ch = this.s[this.pos];
      while (!this.isEOF) {

        // tag found
        if (ch === lt) {
          if (this.peek() === slash) {
            this.next();
            this.emit(itemType.eof);
            return this.lexEndTag;
          } else {
            this.emit(itemType.eof);
            return this.lexStartTag;
          }
        }

        ch = this.next();
      }
      return this.lexNodes;
    }

    lexStartTag() {
      this.pos += lt.length;
      this.emit(itemType.lt);
      const ch = this.peek();
      if (ch === slash) {
        this.ensure();
        return this.lexEndTag;
      }
      return null;
    }

    lexEndTag() {
      this.pos += slash.length;
      this.emit(itemType.slash);
      while (this.isEOF) {
        const ch = this.next();
        if (ch === gt) {
          this.emit(itemType.gt);
          return this.lexNodes;
        }
      }
      return null;
    }

    lexNodes() {
      return null;
    }
  }
}
