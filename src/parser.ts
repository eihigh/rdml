/// <reference path="types.ts" />
/// <reference path="doc.ts" />
/// <reference path="scanner.ts" />

namespace rdml {

  export function parseString(src: string): Node[] {
    const scanner = new Scanner(src);
    scanner.run();
    const parser = new Parser(scanner);
    return parser.parse();
  }

  export class Parser {
    pos: number = 0;

    constructor(private scn: Scanner) { }

    next() {
      this.pos++;
    }

    get item() {
      return this.scn.items[this.pos];
    }

    get typ() {
      return this.item.typ;
    }

    get lit() {
      const i = this.item;
      return this.scn.src.slice(i.start, i.end);
    }

    get isEOF() {
      return this.pos >= this.scn.items.length;
    }

    parse(): Node[] {
      const c = this.parseNodes("");
      return c;
    }

    parseNodes(elName: string): Node[] {
      let nodes: Node[] = [];
      //
      // if (elName === "script") {
      //   let before = this.item;
      //   const start = before.start;
      //   this.next();
      //   while (true) {
      //     if (this.typ === ItemType.elemName && before.typ === ItemType.leftEndTag) {
      //       if (this.lit === "script") {
      //         const end = before.start;
      //         nodes.push(this.scn.src.slice(start, end));
      //         return nodes;
      //       }
      //     }
      //   }
      // }

      while (!this.isEOF) {
        switch (this.typ) {
          case ItemType.text:
            nodes.push(replaceEntitiesInText(this.lit));
            break;

          case ItemType.leftStartTag:
            nodes.push(this.parseElement());
            break;

          case ItemType.leftEndTag:
            if (this.lit !== elName) {
              // error
            }
            this.next(); // consume </
            this.next(); // consume name
            this.next(); // consume >
            return nodes;
        }
        this.next();
      }
      return nodes;
    }

    parseElement(): Element {
      let el = new Element();

      this.next(); // consume <
      el.name = this.lit;
      this.next();

      while (!this.isEOF) {
        const typ = this.typ;
        const lit = this.lit;
        this.next(); // always make progress

        switch (typ) {
          case ItemType.rightStartTag:
            el.childNodes = this.parseNodes(el.name);
            return el;

          case ItemType.rightEmptyTag:
            return el;
        }

        // otherwise, attribute found
        const attr = lit;
        this.next(); // consume '='
        const value = this.lit;
        this.next(); // consume value
        el.attrs[attr] = replaceEntitiesInValue(value);
      }
      return el;
    }
  }

  function replaceEntitiesInValue(src: string) {
    src = src.replace(/&quot;/g, `"`);
    src = src.replace(/&apos;/g, `'`);
    src = src.replace(/&amp;/g, `&`);
    return src;
  }

  function replaceEntitiesInText(src: string) {
    src = src.replace(/&lt;/g, `<`);
    src = src.replace(/&gt;/g, `>`);
    src = src.replace(/&amp;/g, `&`);
    return src;
  }
}

const str = `<p>text<m></m></p>`;
const nodes = rdml.parseString(str);
console.time("parse");
console.log(JSON.stringify(nodes));
console.timeEnd("parse");
