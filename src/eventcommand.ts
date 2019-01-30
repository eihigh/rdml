/// <reference path="types.ts" />
/// <reference path="check.ts" />

namespace rdml.eventcommands {

  interface tkoolCommand {
    code: number;
    indent: number;
    parameters: Param[];
  }

  type Cmds = tkoolCommand[];

  type converter = (c: Cmds, depth: number, e: Element, v: Args) => void;

  interface tkoolParamDesc {
    ref: string;
    index?: number;
  }

  const parse = (el: Element, cmds: Cmds, depth: number) => {
    const desc = commandDescs[el.name];
    const args = makeArgs(el);
    desc.convert(cmds, depth, el, args);
  }

  const singleCommand = (code: number, descs: tkoolParamDesc[]): converter => {

    return (c: Cmds, d: number, e: Element, a: Args) => {
      const p: Param[] = descs.map<Param>((desc) => {
        const i = desc.index === undefined ? 0 : desc.index;
        return a[desc.ref].values[i];
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
      // push end command
      singleCommand(end, [])(c, d, e, a);
    }
  }

  type filter = (src: string) => Param[];

  export namespace fns {
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
    attr: string;
    filter: filter;
  }

  const types: { [name: string]: ParamType } = {
    time: {
      desc: "id",
      attr: "id",
      filter: fns.int(0, null),
    }
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
        { ref: "time" },
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
