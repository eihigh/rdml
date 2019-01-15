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

  enum items {
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
      public typ: items,
      public start: number,
      public end: number
    ) { }
  }

  class Lexer {

    pos: number = 0;
    from: number = 0;
    items: Item[] = [];

    constructor(public s: string) { }

    next() {
      this.pos++;
      return this.s[this.pos];
    }

    peek() {
      return this.next();
    }

    emit(typ: items) {
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
            this.emit(items.eof);
            return this.lexEndTag();
          } else {
            this.emit(items.eof);
            return this.lexStartTag;
          }
        }

        ch = this.next();
      }
      return this.lexNode;
    }

    lexStartTag() {
      return null;
    }

    lexEndTag() {
      return null;
    }

    lexNode() {
      return null;
    }
  }
}
