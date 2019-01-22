/// <reference path="rdml.ts" />
/// <reference path="scanner.ts" />

namespace rdml {

  export class Element {
    name: string = "";
    attrs: Attrs = {};
    childNodes: Node[] = [];

    get children(): Element[] {
      return this.childNodes.filter<Element>((x): x is Element => typeof x !== "string");
    }

    get data(): string {
      let s = "";
      for (const c of this.childNodes) {
        if (typeof c === "string") {
          s += c;
        }
      }
      return s;
    }
  }

  export type Node = Element | string;

  export type Attrs = { [attr: string]: string };

  export class Parser {
    scanner: Scanner = new Scanner("");
    pos: number = 0;
    items: Item[] = [];

    next() {
      this.pos++;
    }

    get item() {
      return this.items[this.pos];
    }

    get typ() {
      return this.item.typ;
    }

    get lit() {
      const i = this.item;
      return this.scanner.src.slice(i.start, i.end);
    }

    parse(): Node[] {
      const c = this.parseNodes("");
      return c;
    }

    parseNodes(elName: string): Node[] {
      let nodes: Node[] = [];
      while (true) {
        switch (this.typ) {
          case ItemType.text:
            nodes.push(this.lit);

          case ItemType.leftStartTag:
            nodes.push(this.parseElement());

          case ItemType.leftEndTag:
            if (this.lit !== elName) {
              // error
            }
            break;
        }
      }
      return nodes;
    }

    parseElement(): Element {
      let el = new Element();

      this.next(); // consume <
      el.name = this.lit;
      this.next();

      while (true) {
        switch (this.typ) {
          case ItemType.rightStartTag:
            this.next();
            el.childNodes = this.parseNodes(el.name);
            break;
          case ItemType.rightEmptyTag:
            this.next();
            break;
        }

        // otherwise, attribute found
        const attr = this.lit;
        this.next(); // consume attr
        this.next(); // consume '='
        const value = this.lit;
        this.next(); // consume value
        el.attrs[attr] = value;
      }
      return el;
    }
  }
}
