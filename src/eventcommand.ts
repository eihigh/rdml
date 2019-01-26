/// <reference path="rdml.ts" />
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

  const units: { [name: string]: Unit } = {
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
