/// <reference path="rdml.ts" />

namespace rdml.scanner {

  const sp = " ";
  const spCc = sp.charCodeAt(0);
  const wsp = "　";
  const wspCc = wsp.charCodeAt(0);
  const tab = "\t";
  const tabCc = tab.charCodeAt(0);
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
  const eof = 0;

  enum ItemType {
    invalid = 0,
    eof,
    text,

    leftStartTag,
    elemName,
    attr,
    equal,
    value,
    rightStartTag,
    rightEmptyTag,

    leftEndTag,
    rightEndTag,
  }

  class Item {
    constructor(
      public typ: ItemType,
      public start: number,
      public end: number,
    ) { }
  }

  type stateFn = ((this: Scanner) => stateFn) | null;

  export class Scanner {
    src: string = "";   // source
    cc: number = 0;     // current charCode; surrogate pair ignored
    start: number = 0;  // token start offset
    offset: number = 0; // charcter offset
    width: number = 0;  // charcter width
    items: Item[] = [];

    constructor(src: string) {
      this.src = src;
    }

    next() {
      if (this.src.length <= this.offset) {
        this.cc = -1;
        return;
      }
      this.cc = this.src.charCodeAt(this.offset);
      this.offset += 1;
    }

    emit(typ: ItemType) {
      this.items.push(new Item(typ, this.start, this.offset));
      this.start = this.offset;
    }

    run() {
      let state: stateFn = this.scanText;
      while (state !== null) {
        state = state();
      }
    }

    get isSpace() {
      switch (this.cc) {
        case spCc:
        case wspCc:
        case crCc:
        case lfCc:
        case tabCc:
          return true;
      }
      return false;
    }

    get isNamespacer() {
      if (this.isSpace) { return true; }
      switch (this.cc) {
        case gtCc:
        case slashCc:
        case equalCc:
          return true;
      }
      return false;
    }

    get isEOF() {
      return this.cc <= 0;
    }

    scanText() {
      console.log(this);
      while (!this.isEOF) {
        if (this.cc === ltCc) {
          return this.scanTag;
        }
        this.next();
      }
      if (this.start < this.offset) {
        this.emit(ItemType.text);
      }
      this.emit(ItemType.eof);
      return null;
    }

    scanTag() {
      this.next(); // consume '<'
      if (this.cc === slashCc) {
        this.next(); // consume '/'
        this.emit(ItemType.leftEndTag);
        return this.scanLeftEndTag;
      }

      this.emit(ItemType.leftStartTag);
      return this.scanStartTag;
    }

    scanLeftEndTag() {
      while (!this.isEOF) {
        if (this.isNamespacer) {
          break;
        }
        this.next();
      }
      this.emit(ItemType.elemName);
      return null;
    }

    scanRightEndTag() {
      while (this.cc > 0) {
        if (this.cc === gtCc) {
          this.next();
          return this.scanText;
        }
        if (true/*not whitespace*/) {
          this.next();
        }
        this.next();
      }
      return null;
    }

    scanStartTag() {
      while (!this.isEOF) {
        if (this.isNamespacer) {
          if (this.start === this.offset) {
            throw new Error(`tag name not found`);
          }
          this.emit(ItemType.elemName);
          return this.scanAttributes;
        }
      }
      this.emit(ItemType.eof);
      return null;
    }

    scanAttributes(): stateFn {
      while (this.isSpace) {
        this.next();
      }
      this.start = this.offset;
      switch (this.cc) {
        case gtCc:
          this.emit(ItemType.rightStartTag);
          return this.scanText;

        case slashCc:
          this.next(); // consume '/'
          if (this.cc !== gtCc) {
            // error 'expected />'
          }
          this.emit(ItemType.rightEmptyTag);
          return this.scanText;

        case equalCc:
          this.next(); // consume '='
          this.emit(ItemType.equal);
          return this.scanAttributes;

        case doubleQtCc:
        case singleQtCc:
          return this.scanValue;
      }
      return this.scanAttrName;
    }

    scanAttrName() {
      while (!this.isEOF) {
        if (this.isNamespacer) {
          this.emit(ItemType.attr);
          return this.scanAttributes;
        }
        this.next();
      }
      return null;
    }

    scanValue() {
      const symbol = this.cc; // ' or "
      this.next(); // consume quotation
      while (!this.isEOF) {
        if (this.cc === symbol) {
          this.emit(ItemType.value);
          this.next(); // consume quotation
          return this.scanAttributes;
        }
      }
      return null;
    }
  }
}

const src = `lorem ipsum`;
let s = new rdml.scanner.Scanner(src);
console.log(s);
s.run();
console.dir(s);
console.log(JSON.stringify(s.items));
