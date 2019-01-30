/// <reference path="types.ts" />
/// <reference path="check.ts" />

namespace rdml {

  /*
   * proc: event procedure
   * called as common event
   */

  export function execProc(i: Game_Interpreter, id: string) {
    const cmds: EventCmd[] = procs[id].cmds;
    i.setupChild(cmds, 0);
  }

  export function makeProc(el: Element) {
    const name = el.attrs["name"];
    procs[name] = new Proc(el);
  }

  export let procs: { [id: string]: Proc } = {};

  export class Proc {
    cmds: EventCmd[] = [];
    lastCmd: EventCmd | null = null;
    children: { [id: string]: Proc } = {};

    constructor(root: Element) {
      for (const c of root.children) {
        pushCommand(this.cmds, c, 0);
      }
    }
  }

  type Cmds = EventCmd[];

  type converter = (c: Cmds, depth: number, e: Element, a: Args) => void;

  interface tkoolParamDesc {
    key: string;
    index?: number;
  }

  const pushCommand = (cmds: Cmds, el: Element, depth: number) => {
    const desc = commandDescs[el.name];
    const args = makeArgs(el);
    desc.convert(cmds, depth, el, args);
  }

  const singleCommand = (code: number, descs: tkoolParamDesc[]): converter => {
    return (c: Cmds, d: number, e: Element, a: Args) => {
      const p: Param[] = descs.map<Param>((desc) => {
        const i = desc.index === undefined ? 0 : desc.index;
        return a[desc.key].values[i];
      });

      c.push({
        code: code,
        indent: d,
        parameters: p,
      });
    }
  }

  const blockCommand = (start: number, end: number, descs: tkoolParamDesc[]): converter => {
    return (c: Cmds, d: number, e: Element, a: Args) => {
      // push start command
      singleCommand(start, descs)(c, d, e, a);
      // push children
      for (const child of e.children) {
        pushCommand(c, child, d + 1);
      }
      // push end command
      singleCommand(end, [])(c, d, e, a);
    }
  }

  type filter = (src: string) => Param[];

  export namespace fs {
    export function fixed(val: Param): filter {
      return (src: string) => [val];
    }

    export function match(cases: { [name: string]: filter }): filter {
      return (src: string) => {
        if (!(src in cases)) { throw new Error(`no matches`); }
        return cases[src](src);
      }
    }

    export function int(min: number | null, max: number | null): filter {
      return (src: string) => [check.int(src, min, max)];
    }
  }

  interface ParamType {
    desc: string;
    filter: filter;
  }

  const types: { [name: string]: ParamType } = {
    word: {
      desc: "単語",
      filter: (src: string) => [src.trim()],
    },
    time: {
      desc: "フレーム数",
      filter: fs.int(0, null),
    },
  };

  interface SubAttrDesc {
    key: string;
    typ: ParamType;
  }

  interface AttrDesc {
    key: string;
    subs?: SubAttrDesc[];
    typ: ParamType;
    default: Param | null;
  }

  interface CommandDesc {
    desc: string;
    attrs: AttrDesc[];
    convert: converter;
  }

  const REQUIRED = null;

  const commandDescs: { [name: string]: CommandDesc } = {
    wait: {
      desc: "指定時間待機します。",
      attrs: [
        {
          key: "time",
          typ: types.time,
          default: REQUIRED,
        },
        // {
        //  attr: "actor",
        //  subs: [
        //    { attr: "hp", unit: units.uint, },
        //    { attr: "mp", unit: units.uint, },
        //    { attr: "tp", unit: units.uint, },
        //  ],
        //  unit: units.actorID,
        //  default: REQUIRED,
        // },
      ],
      convert: singleCommand(103, [
        { key: "time" },
      ]),
      // convert: singleCommand(103, [
      //   { ref: "actor" },
      // ]),
    },
  };

  interface Arg {
    sub: string; // actually described attr if sub attr
    values: Param[]; // can be array e.g. colors
  }

  type Args = { [attr: string]: Arg };

  function makeArgs(el: Element) {
    if (!(el.name in commandDescs)) {
      throw new Error(`unknown command "${el.name}"`);
    }
    let args: Args = {};
    const cmd = commandDescs[el.name]; // パラメータ変換の素

    for (const attr of cmd.attrs) {

      if (attr.subs === undefined) {
        const key = attr.key;
        const values = attr.typ.filter(el.attrs[key]);
        args[key] = {
          sub: "",
          values: values,
        };

      } else {

        for (const sub of attr.subs) {
          // const attr = sub.key;
          // if (attr in el.attrs) {
          //   const value = makeSubValue(sub);
          // }
        }
      }
    }

    return args;
  }

  function makeSubValue(el: Element, sub: SubAttrDesc): Param[] {
    if (!(sub.key in el.attrs)) { return []; }
    const key = sub.key;
    return sub.typ.filter(el.attrs[key]);
  }
}
