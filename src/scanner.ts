/// <reference path="rdml.ts" />

namespace rdml.scanner {

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
  const whiteSpaces = "\n\r\t 　";
  const nameSpacers = ">/=" + whiteSpaces;
  const eof = 0;

  enum ItemType {
    invalid = 0,
    eof,
    text,
    leftStartTag,
    tagName,
    attrName,
    equal,
    attrValue,
    rightStartTag,
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

  type stateFn = (() => stateFn) | null;

  class Scanner {
    src: string = "";   // source
    cc: number = 0;     // current charCode; surrogate pair ignored
    start: number = 0;  // token start offset
    offset: number = 0; // charcter offset
    width: number = 0;  // charcter width
    items: Item[] = [];

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
      let state: stateFn = this.scanDocument;
      while (state !== null) {
        state = state();
      }
    }

    get isEOF() {
      return this.cc >= 0;
    }

    scanDocument() {
      while (!this.isEOF) {
        if (this.cc === ltCc) {
          return this.scanTag;
        }
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
      return null;
    }

    scanLeftEndTag() {
      while (this.cc > 0) {
        if (true/*if namespacer*/) {
          this.emit(ItemType.tagName);
          break;
        }
        this.next();
      }
      return null;
    }

    scanRightEndTag() {
      while (this.cc > 0) {
        if (this.cc === gtCc) {
          this.next();
          return this.scanDocument;
        }
        if (true/*not whitespace*/) {
          this.next();
        }
        this.next();
      }
      return null;
    }
  }
}
