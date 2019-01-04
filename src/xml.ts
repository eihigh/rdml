/// <reference path="rdml.ts" />

namespace rdml.xml {

  // API
  export function parseString(s: string): Node[] {
    return [];
  }

  // Types
  export type Node = Element | string;

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

  export type Attrs = { [attr: string]: string };

  // Internal
  // Parser
  const sp = " ";
  const spCc = sp.charCodeAt(0);
  const lt = "<";
  const ltCc = lt.charCodeAt(0);
  const gt = ">";
  const gtCc = gt.charCodeAt(0);
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
}
