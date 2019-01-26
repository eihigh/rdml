/// <reference path="doc.ts" />

namespace rdml {

  export type Node = Element | string;

  export type Attrs = { [attr: string]: string };

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

  export type Param = string | number;

  export interface EventCmd {
    code: number;
    indent: number;
    parameters: Param[];
  }
}
