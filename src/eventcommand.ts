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

  type converter = (c: tkoolCommand[], depth: number, e: Element, v: rdmlValues) => void;

  // only for single command
  interface tkoolParamDesc {
    ref: string;
  }

  const singleCommand = (code: number, descs: tkoolParamDesc[]): converter => {
    return (c: tkoolCommand[], d: number, e: Element, v: rdmlValues) => {
      let p: Param[] = [];
      for (const desc of descs) {
        p.push(v[desc.ref].params[0]);
      }
      c.push({
        code: code,
        indent: d,
        parameters: p,
      });
    }
  }

  interface Unit { }

  interface subParamDesc {
    attr: string;
    unit: Unit;
  }

  interface paramDesc {
    attr: string;
    subs?: subParamDesc[];
    unit: Unit;
    default: Param | null;
  }

  interface commandDesc {
    desc: string;
    params: paramDesc[];
    convert: converter;
  }

  const REQUIRED = null;

  const commandDescs: { [name: string]: commandDesc } = {
    wait: {
      desc: "指定時間待機します。",
      params: [
        {
          attr: "time",
          unit: rdml.units.id,
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
    }
  };

  interface rdmlValue {
    sub: string; // actually described attr if sub attr
    params: Param[]; // can be array e.g. colors
  }

  type rdmlValues = { [attr: string]: rdmlValue };

  function elem2values(el: Element) {
    if (!(el.name in commandDescs)) {
      throw new Error(`unknown command "${el.name}"`);
    }
    let values: rdmlValues = {};
    const desc = commandDescs[el.name]; // パラメータ変換の素

    for (const param of desc.params) {
      const attr = param.attr;
      if (param.subs !== undefined) {
        for (const sub of param.subs) {
          if (sub.attr === attr) {
            // value = sub.unit.validate[el.attrs[attr]];
            const value: Param = 0;
            values[attr] = {
              sub: attr,
              params: [value],
            }
          }
        }
      } else {

      }
    }

    return values;
  }
}
