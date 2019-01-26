/// <reference path="rdml.ts" />
/// <reference path="parser.ts" />
/// <reference path="check.ts" />

namespace rdml {

  interface Converter {
    convert: (src: string) => Param;
  }

  namespace conv {
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

  interface unit {
    attr: string;
    desc: string;
    converter: Converter;
  }

  const units: { [name: string]: unit } = {
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
    unit: unit;
    desc: string;
    default: Param | null;
  }

  interface tkoolParam {
    ref: string;
    index?: number;
  }

  interface command {
    aliases: string[];
    dataAttr: string;
    rdmlParams: rdmlParam[];
    tkoolParams: tkoolParam[];
  }

  const REQUIRED = null;

  const commands: { [name: string]: command } = {
    wait: {
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
        { ref: "time" },
      ],
    },
  };

  function elem2cmd(el: Element) {
    if (!(el.name in commands)) {
      throw new Error(`unknown command ${el.name}`);
    }
    const cmd = commands[el.name]; // TODO aliases
    const rps = cmd.rdmlParams;

    let results: { [attr: string]: Param } = {};
    for (const rp of rps) {
      const unit = rp.unit;
      const attr = unit.attr; // TODO aliases
      const value = el.attrs[attr];
      const conved = unit.converter.convert(value);
      results[attr] = conved;
    }

    let params: Param[] = [];
    for (let i = 0; i < cmd.tkoolParams.length; i++) {
      const tp = cmd.tkoolParams[i];
      const param = results[tp.ref];
      params.push(param);
    }
  }
}
