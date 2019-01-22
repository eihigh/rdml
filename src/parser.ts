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
      if (this.childNodes.length === 1) {
        const c = this.childNodes[0];
        if (typeof c === "string") { return c; }
        return "";
      }

      let s = "";
      for (const c of this.childNodes) {
        if (typeof c === "string") { s += c; }
      }
      return s;
    }

    get isEmptyElement() {
      switch (this.name) {
        case "br":
          return true;
      }
      return false;
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

      if (elName === "script") {
        let before = this.item;
        const start = before.start;
        this.next();
        while (true) {
          if (this.typ === ItemType.elemName && before.typ === ItemType.leftEndTag) {
            if (this.lit === "script") {
              const end = before.start;
              nodes.push(this.scanner.src.slice(start, end));
              return nodes;
            }
          }
        }
      }

      while (true) {
        switch (this.typ) {
          case ItemType.text:
            nodes.push(replaceEntitiesInText(this.lit));

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
        const typ = this.typ;
        const lit = this.lit;
        this.next(); // always make progress

        switch (this.typ) {
          case ItemType.rightStartTag:
            if (el.isEmptyElement) { break; }
            el.childNodes = this.parseNodes(el.name);
            break;

          case ItemType.rightEmptyTag:
            break;
        }

        // otherwise, attribute found
        const attr = lit;
        this.next(); // consume '='
        const value = this.lit;
        this.next(); // consume value
        el.attrs[attr] = replaceEntitiesInQt(value);
      }
      return el;
    }
  }

  function replaceEntitiesInQt(src: string) {
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
