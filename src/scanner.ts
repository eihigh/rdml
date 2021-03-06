/// <reference path="doc.ts" />

namespace rdml {

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

  export enum ItemType {
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

  export class Item {
    constructor(
      public typ: ItemType,
      public start: number,
      public end: number,
    ) { }
  }

  type stateFn = ((this: Scanner) => stateFn) | null;

  class ScanError implements Error {
    name = "Syntax Error";
    message: string;
    constructor(msg: string, line: number) {
      this.message = `${this.name}: ${msg} at line ${line}`
    }
  }

  export class Scanner {
    src: string = "";    // source
    cc: number = 0;      // current charCode; surrogate pair ignored
    start: number = 0;   // token start offset
    offset: number = -1; // charcter offset
    line: number = 1;    // line number
    width: number = 1;   // charcter width
    items: Item[] = [];
    err: ScanError | null = null;

    constructor(src: string) {
      this.src = src;
      this.next();
    }

    next() {
      this.offset += this.width;
      if (this.src.length <= this.offset) {
        this.cc = -1;
        return;
      }
      const c = this.src.charCodeAt(this.offset);
      this.width = (0xD800 <= c && c <= 0xDBFF) || (0xDC00 <= c && c <= 0xDFFF) ? 2 : 1;
      this.cc = c;
      if (this.cc === lfCc) {
        this.line++;
      }
    }

    emit(typ: ItemType) {
      this.items.push(new Item(typ, this.start, this.offset));
      this.start = this.offset;
    }

    run() {
      let state: stateFn = this.scanText;
      while (state !== null) {
        state = state.call(this);
      }
      if (this.err !== null) {
        throw this.err;
      }
    }

    fail(msg: string) {
      this.emit(ItemType.invalid);
      this.err = new ScanError(msg, this.line);
      return null;
    }

    ignoreSpaces() {
      while (!this.isEOF) {
        if (!this.isSpace) {
          break;
        }
        this.next();
        this.start = this.offset;
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
      return this.cc < 0;
    }

    dump() {
      let obj: any = [];
      for (const item of this.items) {
        obj.push({
          typ: item.typ,
          lit: this.src.slice(item.start, item.end),
        })
      }
      return JSON.stringify(obj);
    }

    scanText() {
      while (!this.isEOF) {
        if (this.cc === ltCc) {
          if (this.start < this.offset) {
            this.emit(ItemType.text);
          }
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

    scanTag(): stateFn {
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
          this.emit(ItemType.elemName);
          return this.scanRightEndTag;
        }
        this.next();
      }
      return this.fail(`unclosed end tag`);
    }

    scanRightEndTag() {
      while (!this.isEOF) {
        if (this.cc === gtCc) {
          this.next(); // consume '>'
          this.emit(ItemType.rightEndTag);
          return this.scanText;
        }
        if (!this.isSpace) {
          return this.fail(`expected '>'`);
        }

        // consume and ignore space
        this.next();
        this.start = this.offset;
      }
      return this.fail(`unclosed end tag`);
    }

    scanStartTag() {
      while (!this.isEOF) {
        if (this.isNamespacer) {
          this.emit(ItemType.elemName);
          return this.scanAttribute;
        }
        this.next();
      }
      return this.fail(`unclosed start tag`);
    }

    scanAttribute(): stateFn {
      this.ignoreSpaces();
      switch (this.cc) {
        case slashCc:
          this.next(); // consume '/'
          if (this.cc === gtCc) {
            this.next(); // consume '>'
            this.emit(ItemType.rightEmptyTag);
            return this.scanText;
          }
          return this.fail(`expected '/>', found '/'`);

        case gtCc:
          this.next(); // consume '>'
          this.emit(ItemType.rightStartTag);
          return this.scanText;

        case singleQtCc:
        case doubleQtCc:
          return this.fail(`unexpected ${this.src[this.offset]}`);
      }

      while (!this.isEOF) {
        if (this.isNamespacer) {

          this.emit(ItemType.attr);
          this.ignoreSpaces();

          if (this.cc === equalCc) {
            this.next(); // consume '='
            this.emit(ItemType.equal);
            this.ignoreSpaces();
            return this.scanValue;
          }
          return this.fail(`expected '='`);
        }

        this.next();
      }
      return this.fail(`unclosed start tag`);
    }

    scanValue() {
      const qt = this.cc; // ' or "
      this.next(); // consume qt
      this.start = this.offset;
      while (!this.isEOF) {
        if (this.cc === qt) {
          this.emit(ItemType.value);
          this.next(); // consume qt
          this.start = this.offset;
          return this.scanAttribute;
        }
        this.next();
      }
      return this.fail(`unclosed value`);
    }
  }
}

// const src = `<p a    = '  aaaa'   />`
// console.log(src);
// let s = new rdml.Scanner(src);
// console.time('scanning');
// try {
//   s.run();
// } catch (e) {
//   console.log(e.message);
// }
// console.timeEnd('scanning');
// const fact = s.dump();
// console.log(fact);
