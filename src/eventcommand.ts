/// <reference path="types.ts" />
/// <reference path="check.ts" />

namespace rdml {

  interface Converter {
    convert: (src: string) => Param;
  }

  export namespace conv {
    export class Fixed {
      constructor(private param: Param) { }
      convert(src: string) { return this.param; }
    }

    export class Int {
      constructor(
        private min: number | null,
        private max: number | null,
      ) { }
      convert(src: string) { return check.int(src, this.min, this.max); }
    }

    export class Match {
      constructor(private cases: { [name: string]: Converter }) { }
      convert(src: string) {
        if (src in this.cases) {
          return this.cases[src].convert("");
        }
        return this.cases[""].convert(src);
      }
    }
  }

  export interface Unit {
    attr: string;
    desc: string;
    converter: Converter;
  }

  export const units: { [name: string]: Unit } = {
    id: {
      attr: "id",
      desc: "ID",
      converter: new conv.Int(0, null),
    },
    idBased1: {
      attr: "id",
      desc: "1以上のID",
      converter: new conv.Match({
        "all": new conv.Fixed(-2),
        "": new conv.Int(1, null),
      }),
    },
    actorID: {
      attr: "id",
      desc: "アクターID",
      converter: new conv.Match({
        "all": new conv.Fixed(0),
        "": new conv.Int(1, null),
      }),
    },
    time: {
      attr: "time",
      desc: "フレーム数",
      converter: new conv.Int(0, null),
    },
  }

  interface rdmlParam {
    unit: Unit;
    desc: string;
    default: Param | null;
  }

  interface tkoolParam {
    attr: string;
    index?: number;
  }

  interface cmdDefinition {
    code: number;
    aliases: string[];
    dataAttr: string;
    rdmlParams: rdmlParam[];
    tkoolParams: tkoolParam[];
  }

  const REQUIRED = null;

  const cmdDefinitions: { [name: string]: cmdDefinition } = {
    wait: {
      code: 230,
      aliases: [],
      dataAttr: "time",
      rdmlParams: [
        {
          unit: units.time,
          desc: "ウェイト時間",
          default: 60,
        },
      ],
      tkoolParams: [
        { attr: "time" },
      ],
    },
  };

  export function elem2cmd(el: Element): EventCmd {
    if (!(el.name in cmdDefinitions)) {
      throw new Error(`unknown command "${el.name}"`);
    }
    const cmd = cmdDefinitions[el.name]; // TODO aliases

    let results: { [attr: string]: Param } = {};
    for (const rp of cmd.rdmlParams) {
      const unit = rp.unit;
      const attr = unit.attr; // TODO aliases
      const value = el.attrs[attr];
      if (rp.default === REQUIRED && value === "") {
        throw new Error(`required "${attr}" for "${el.name}" command`);
      }
      const conved = (value === "" && rp.default !== null)
        ? rp.default : unit.converter.convert(value);
      results[attr] = conved;
    }

    let params: Param[] = [];
    for (const tp of cmd.tkoolParams) {
      const param = results[tp.attr];
      params.push(param);
    }

    return {
      code: cmd.code,
      indent: 0,
      parameters: params,
    };
  }
}

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
